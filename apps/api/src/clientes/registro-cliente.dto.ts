import { Equals, IsOptional, IsString, Length } from 'class-validator';

export class RegistroClienteDto {
  @IsString()
  @Length(1, 80)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  correo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  telefono?: string;

  // Sin consentimiento explícito no se guarda nada (ley de datos personales).
  @Equals(true, { message: 'Debes aceptar recibir ofertas para registrarte' })
  consentimiento: true;
}
