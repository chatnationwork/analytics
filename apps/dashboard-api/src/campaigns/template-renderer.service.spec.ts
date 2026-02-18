/**
 * Unit tests for TemplateRendererService
 */

import { Test, TestingModule } from "@nestjs/testing";
import { TemplateRendererService } from "./template-renderer.service";
import { ContactEntity } from "@lib/database";

describe("TemplateRendererService", () => {
  let service: TemplateRendererService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateRendererService],
    }).compile();

    service = module.get<TemplateRendererService>(TemplateRendererService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("should replace simple placeholders with contact data", () => {
      const template = "Hello {{name}}!";
      const contact = {
        name: "John Doe",
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Hello John Doe!");
    });

    it("should replace multiple placeholders", () => {
      const template = "Hi {{name}}, your phone is {{contactId}}";
      const contact = {
        name: "Jane Smith",
        contactId: "254712345678",
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Hi Jane Smith, your phone is 254712345678");
    });

    it("should handle missing fields by using empty string", () => {
      const template = "Email: {{email}}";
      const contact = {
        email: null,
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Email: ");
    });

    it("should use fallback value when field is null", () => {
      const template = "Hello {{name|Guest}}!";
      const contact = {
        name: null,
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Hello Guest!");
    });

    it("should use field value instead of fallback when field exists", () => {
      const template = "Hello {{name|Guest}}!";
      const contact = {
        name: "John Doe",
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Hello John Doe!");
    });

    it("should handle multiple placeholders with fallbacks", () => {
      const template = "{{name|Guest}}, email: {{email|No email provided}}";
      const contact = {
        name: "Alice",
        email: null,
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Alice, email: No email provided");
    });

    it("should resolve nested metadata fields", () => {
      const template = "Company: {{metadata.company}}";
      const contact = {
        metadata: { company: "Acme Inc" },
      } as Partial<ContactEntity> as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Company: Acme Inc");
    });

    it("should handle missing metadata fields", () => {
      const template = "City: {{metadata.city}}";
      const contact = {
        metadata: null,
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("City: ");
    });

    it("should use fallback for missing metadata fields", () => {
      const template = "Company: {{metadata.company|Unknown Company}}";
      const contact = {
        metadata: { city: "Nairobi" },
      } as Partial<ContactEntity> as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Company: Unknown Company");
    });

    it("should convert number fields to strings", () => {
      const template = "Born in {{yearOfBirth}}";
      const contact = {
        yearOfBirth: 1990,
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Born in 1990");
    });

    it("should handle empty string fields as null", () => {
      const template = "{{name|Guest}}";
      const contact = {
        name: "",
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("Guest");
    });

    it("should preserve whitespace in fallback values", () => {
      const template = "{{name|[Not Provided]}}";
      const contact = {
        name: null,
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe("[Not Provided]");
    });

    it("should handle complex templates with mixed content", () => {
      const template = `Dear {{name|Valued Customer}},

Your contact ID is {{contactId}}.
Email: {{email|Not provided}}
Company: {{metadata.company|N/A}}

Thank you!`;

      const contact = {
        name: "Bob",
        contactId: "254700000000",
        email: null,
        metadata: null,
      } as ContactEntity;

      const result = service.render(template, contact);
      expect(result).toBe(`Dear Bob,

Your contact ID is 254700000000.
Email: Not provided
Company: N/A

Thank you!`);
    });
  });

  describe("extractPlaceholders", () => {
    it("should extract placeholder field names", () => {
      const template = "Hello {{name}}, your email is {{email}}";
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(["name", "email"]);
    });

    it("should extract fields from placeholders with fallbacks", () => {
      const template = "{{name|Guest}}, {{email|No email}}";
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(["name", "email"]);
    });

    it("should extract metadata fields", () => {
      const template = "{{metadata.company}} in {{metadata.city}}";
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(["metadata.company", "metadata.city"]);
    });

    it("should not include duplicate placeholders", () => {
      const template = "{{name}} {{name}} {{name}}";
      const result = service.extractPlaceholders(template);
      expect(result).toEqual(["name"]);
    });

    it("should return empty array when no placeholders exist", () => {
      const template = "Hello there, no placeholders here!";
      const result = service.extractPlaceholders(template);
      expect(result).toEqual([]);
    });
  });
});
