# Up to 40%

*by OmT Finance*

App web instalable (PWA) para llevar el control de los días de teletrabajo por trimestre, con un límite del 40% de los días laborables.

## Funcionamiento

- Pantalla de inicio con el logo; al pulsar **Entrar** se pasa a los calendarios.
- Siempre en vertical: en Android la app instalada se bloquea en vertical; en iPhone, que no permite bloquearla, se muestra un aviso para girar el móvil.
- Calendario de cada trimestre (Q1: ene–mar, Q2: abr–jun, Q3: jul–sep, Q4: oct–dic), que se cambia desde la barra inferior. Al tocar el nombre del trimestre se vuelve al actual.
- Festivos nacionales de España marcados automáticamente (incluido Viernes Santo, que se calcula cada año).
- Tipos de día (se desmarcan volviendo a tocar el día):
  - **Teletrabajo**: suma 1.
  - **Medio día teletrabajo**: suma 0,5.
  - **Libre**, **Vacaciones** y **Otros** (baja, médico…): cuentan como laborables sin teletrabajo, igual que ir a la oficina.
  - **Festivo**: no cuenta como laborable.
- **Días laborables** = días entre semana − festivos.
- **Días permitidos** = 40% de los laborables, redondeado hacia abajo al medio día.
- **Disponibles** = permitidos − teletrabajo marcado.

En el menú ⋯ están: ir al trimestre actual, **opciones de visualización** (modo oscuro, claro o automático y cuatro fondos: Glaciar, Coral, Menta y Ámbar) y **exportar/importar calendario**.

Los datos se guardan en el propio dispositivo (`localStorage`). Para pasarlos a otro dispositivo, usa exportar e importar calendario.

### Formato del calendario exportado

Archivo de texto plano (`.txt`), una línea por día marcado con la fecha y el tipo separados por un tabulador. Las líneas que empiezan por `#` se ignoran:

```
# Q3 2026
2026-07-01	Teletrabajo
2026-07-02	Medio día teletrabajo
2026-07-06	Vacaciones
```

Al importar se aceptan también espacios, `;` o `,` como separador, y el tipo sin tildes ni mayúsculas.

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
