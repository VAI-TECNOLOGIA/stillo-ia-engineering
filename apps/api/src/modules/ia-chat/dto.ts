import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MaxLength(2000)
  mensagem!: string;

  @IsOptional()
  @IsString()
  conversaId?: string;
}
