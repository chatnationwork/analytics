import { IsString, IsArray, IsEnum, IsNotEmpty } from "class-validator";

export class CreatePollDto {
  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsEnum(["event", "exhibitor", "speaker"])
  ownerType: "event" | "exhibitor" | "speaker";

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];
}
