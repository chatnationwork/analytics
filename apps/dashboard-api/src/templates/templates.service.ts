import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TemplateEntity, TemplateStatus } from "@lib/database";
import { CreateTemplateDto } from "./dto/create-template.dto";

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(TemplateEntity)
    private readonly templateRepo: Repository<TemplateEntity>,
  ) {}

  async importTemplate(
    tenantId: string,
    userId: string | null,
    dto: CreateTemplateDto,
  ): Promise<TemplateEntity> {
    
    let structure = dto.structure;
    if (typeof structure === 'string') {
      try {
        structure = JSON.parse(structure);
      } catch (e) {
        throw new BadRequestException("Invalid JSON structure");
      }
    }

    // Attempt to extract name and language if not provided
    const extractedName = structure?.template?.name || structure?.name;
    const extractedLang = structure?.template?.language?.code || structure?.language?.code || structure?.language;

    const name = dto.name || extractedName;
    const language = dto.language || extractedLang;

    if (!name || !language) {
      throw new BadRequestException("Could not extract Template Name or Language from JSON. Please provide them manually.");
    }

    // Determine body text: use manual input or fallback to extraction
    let bodyText: string | null | undefined = dto.bodyText || null;
    let variables: string[] = [];

    if (bodyText) {
      // Extract variables from manual body text
      variables = this.extractVariables(bodyText);
    } else {
      // Fallback: try to extract from JSON
      const parsed = this.parseTemplateStructure(structure);
      bodyText = parsed.bodyText;
      variables = parsed.variables;
    }

    const template = this.templateRepo.create({
      tenantId,
      name,
      language,
      category: dto.category ?? null,
      structure: structure as Record<string, unknown>,
      bodyText,
      variables,
      status: TemplateStatus.APPROVED, // Auto-approve imported templates
      createdBy: userId,
    });

    return this.templateRepo.save(template);
  }

  private extractVariables(text: string): string[] {
      const variableMatches = text.match(/\{\{\d+\}\}/g) || [];
      const variables = variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""));
      return [...new Set(variables)];
  }

  async list(tenantId: string): Promise<TemplateEntity[]> {
    return this.templateRepo.find({
      where: { tenantId },
      order: { createdAt: "DESC" },
    });
  }

  async findById(tenantId: string, id: string): Promise<TemplateEntity> {
    const template = await this.templateRepo.findOne({
      where: { id, tenantId },
    });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const result = await this.templateRepo.delete({ id, tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(`Template ${id} not found`);
    }
  }

  private parseTemplateStructure(structure: any): { bodyText: string | null; variables: string[] } {
    try {
      // Check if structure is string, if so parse it
      const payload = typeof structure === 'string' ? JSON.parse(structure) : structure;
      
      const components = payload?.template?.components || payload?.components;
      
      if (!Array.isArray(components)) {
        return { bodyText: null, variables: [] };
      }

      const bodyComponent = components.find((c: any) => c.type === 'BODY' || c.type === 'body');
      
      if (!bodyComponent) {
        return { bodyText: null, variables: [] };
      }

      const text = bodyComponent.text || "";
      
      // Extract variables strictly from the text, e.g. {{1}}, {{2}}
      const variableMatches = text.match(/\{\{\d+\}\}/g) || [];
      const variables = variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""));

      // Unique variables
      const uniqueVariables = [...new Set(variables)];

      return { bodyText: text, variables: uniqueVariables as string[] };
    } catch (e) {
      this.logger.error("Failed to parse template structure", e);
      return { bodyText: null, variables: [] };
    }
  }
}
