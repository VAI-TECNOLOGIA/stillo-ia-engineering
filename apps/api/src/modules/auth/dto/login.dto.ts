import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres.' })
  senha!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
