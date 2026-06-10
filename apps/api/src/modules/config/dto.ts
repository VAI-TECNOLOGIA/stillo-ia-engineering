import { IsOptional, IsString, MinLength } from 'class-validator';

export class VincularOpenAiDto {
  @IsString()
  @MinLength(20, { message: 'Chave da OpenAI parece inválida (muito curta).' })
  apiKey!: string;

  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsString() embeddingModel?: string;
  @IsOptional() @IsString() baseUrl?: string;
}
