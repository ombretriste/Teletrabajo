# Teletrabajo 40%

App web instalable (PWA) para llevar el control de los días de teletrabajo por trimestre, con un límite del 40% de los días laborables.

## Funcionamiento

- Calendario de cada trimestre (Q1: ene–mar, Q2: abr–jun, Q3: jul–sep, Q4: oct–dic).
- Festivos nacionales de España marcados automáticamente (incluido Viernes Santo, que se calcula cada año).
- Cada día laborable se puede marcar como 🏠 teletrabajo, 🌴 día libre o 🎉 festivo (para los autonómicos o locales). Los días sin marcar cuentan como presenciales.
- Tema claro u oscuro: por defecto sigue el del móvil y se puede fijar a mano en «Apariencia».
- **Días laborables** = días entre semana − festivos − días libres.
- **Días permitidos** = 40% de los laborables, redondeado hacia abajo.
- **Disponibles** = permitidos − días de teletrabajo ya marcados.

Los datos se guardan en el propio dispositivo (`localStorage`). Para pasarlos a otro dispositivo, usa **Exportar copia** / **Importar copia**.

## Instalar en el móvil

- **iPhone (Safari):** Compartir → «Añadir a pantalla de inicio».
- **Android (Chrome):** menú ⋮ → «Instalar aplicación».

## Desarrollo

Es un sitio estático sin dependencias ni paso de compilación. Para probarlo en local:

```bash
python3 -m http.server 8000
```

Al cambiar archivos, sube la versión de `CACHE` en `sw.js` para que los móviles instalados descarguen la nueva versión.

## Despliegue

Importa el repositorio en [Vercel](https://vercel.com/new) con el preset **Other** (sin comando de compilación). Cada `git push` a `main` se despliega automáticamente.
