import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

export class SegmentoDto {
  @IsOptional()
  @IsString()
  @Length(0, 80)
  producto?: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  minCompras: number;

  @IsInt()
  @Min(1)
  @Max(365)
  dias: number;
}

export class VistaPreviaDto {
  @ValidateNested()
  @Type(() => SegmentoDto)
  segmento: SegmentoDto;
}

export class CrearOfertaDto {
  @IsString()
  @Length(1, 120)
  asunto: string;

  @IsString()
  @Length(1, 2000)
  mensaje: string;

  @ValidateNested()
  @Type(() => SegmentoDto)
  segmento: SegmentoDto;
}
