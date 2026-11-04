import { Transform } from 'class-transformer';
import { Equals, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegistroClienteDto {
  // El nombre se recorta antes de validar: "   " no cuenta como nombre. Sin saltos de línea,
  // porque el nombre va en el saludo de los correos.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  @Matches(/^[^\r\n]+$/, { message: 'El nombre no puede tener saltos de línea' })
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
