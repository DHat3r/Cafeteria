import { IsString, Length } from 'class-validator';

export class ConsultaSocioDto {
  // Correo o teléfono: el servicio decide cuál es al normalizarlo.
  @IsString()
  @Length(1, 120)
  contacto: string;
}
