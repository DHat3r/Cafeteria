// Crea el archivo .env a partir de .env.example, con secretos aleatorios.
// Uso: node scripts/crear-env.mjs   (o: npm run env)
//
// - Si .env ya existe no lo toca: regenerar las claves dejaría ilegibles los datos
//   de clientes que ya estén cifrados en la base.
// - Los secretos no se muestran por pantalla: quedan solo en .env, que está en .gitignore.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = new URL("../", import.meta.url);
const destino = fileURLToPath(new URL(".env", raiz));
const ejemplo = fileURLToPath(new URL(".env.example", raiz));

if (existsSync(destino)) {
  console.log(".env ya existe: no se modificó. Bórralo solo si no tienes datos que conservar.");
  process.exit(0);
}

// Cada variable se rellena solo si en .env.example está vacía.
const generadores = {
  JWT_SECRET: () => randomBytes(32).toString("hex"),
  // AES-256 necesita una clave de exactamente 32 bytes.
  CLIENTES_ENC_KEY: () => randomBytes(32).toString("base64"),
  CLIENTES_HMAC_KEY: () => randomBytes(32).toString("base64"),
  ADMIN_PASSWORD: () => randomBytes(12).toString("base64url"),
};

const lineas = readFileSync(ejemplo, "utf8")
  .split(/\r?\n/)
  .map((linea) => {
    const [, nombre, valor] = /^([A-Z_]+)=(.*)$/.exec(linea) ?? [];
    return nombre in generadores && valor === "" ? `${nombre}=${generadores[nombre]()}` : linea;
  });

// 0o600: solo el dueño puede leer el archivo.
writeFileSync(destino, lineas.join("\n"), { mode: 0o600 });

console.log(".env creado con secretos aleatorios.");
console.log("La contraseña del administrador está en ADMIN_PASSWORD (dentro de .env).");
console.log("Guarda una copia de CLIENTES_ENC_KEY y CLIENTES_HMAC_KEY: sin ellas no se pueden leer los datos de los clientes.");
