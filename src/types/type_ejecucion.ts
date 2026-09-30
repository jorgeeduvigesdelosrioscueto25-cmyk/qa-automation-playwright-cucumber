import type { Usuario } from './type_usuario';
import type { Comprador } from './type_comprador';
export const NAVEGADORES = ['chromium', 'firefox', 'webkit'] as const;
export type Navegador = (typeof NAVEGADORES)[number];
export type Estado = 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
export interface DatosPrueba extends Usuario, Comprador {
  id: number;
  tap: string;
  ejecutar: boolean;
  escenario: string;
  resultadoEsperado: string;
  hoja: string;
  libro: string;
  productos: string[];
  mensajeEsperado: string;
  campoVacio: string;
}
export interface CasoSeleccionado {
  uri: string;
  nombreGherkin: string;
  id: number;
  tags: string[];
  datos: DatosPrueba;
  pasos: string[];
}
export interface ResultadoPaso {
  nombre: string;
  estado: string;
  duracionMs: number;
  error?: string;
  captura?: string;
}
export interface ResultadoCaso {
  tap: string;
  id: number;
  escenario: string;
  nombreGherkin: string;
  modulo: string;
  navegador: Navegador;
  estado: Estado;
  inicio: string;
  duracionMs: number;
  url: string;
  pasos: ResultadoPaso[];
  motivo?: string;
  error?: string;
  tipoError?: 'FUNCIONAL' | 'DATOS' | 'INFRAESTRUCTURA';
  trace?: string;
  documento?: string;
  errorHtml?: string;
}
export interface Manifiesto {
  inicio: string;
  reporte: string;
  navegadores: Navegador[];
  modo: string;
  baseUrl: string;
  casos: CasoSeleccionado[];
  dryRun: boolean;
}
export interface Resumen {
  manifiesto: Manifiesto;
  fin?: string;
  duracionMs: number;
  resultados: ResultadoCaso[];
  erroresTecnicos: string[];
  metricas: {
    seleccionados: number;
    passed: number;
    failed: number;
    skipped: number;
    pendientes: number;
    tasaExito: number | null;
  };
}
