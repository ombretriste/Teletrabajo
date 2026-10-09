# Up to 40%

*by OmT Finance*

Versión **1.1.0** (se muestra en la pantalla de inicio). Las correcciones y ajustes suben el último número (1.0.1); las novedades, el del medio (1.1.0).

App web instalable (PWA) para llevar el control de los días de teletrabajo por trimestre, con un límite del 40% de los días laborables.

## Funcionamiento

- Pantalla de inicio con el logo; al pulsar **Entrar** se pasa a los calendarios.
- Siempre en vertical: en Android la app instalada se bloquea en vertical; en iPhone, que no permite bloquearla, se muestra un aviso para girar el móvil.
- Calendario de cada trimestre (Q1: ene–mar, Q2: abr–jun, Q3: jul–sep, Q4: oct–dic), que se cambia desde la barra inferior. Al tocar el nombre del trimestre se vuelve al actual.
- Festivos nacionales de España marcados automáticamente (incluido Viernes Santo, que se calcula cada año).
- Tipos de día (se desmarcan volviendo a tocar el día). Seis botones: Teletrabajo, Libre disposición, Vacaciones y Otros abren un menú con sus variantes; Días con horas y Festivo van solos:
  - **Teletrabajo**: suma 1.
  - **Medio día teletrabajo**: suma 0,5.
  - **Libre disposición**, **Vacaciones**, **Vacaciones año anterior**, **Días con horas** y **Festivo**: no cuentan como laborables.
  - **Medio día libre**: cuenta medio laborable y consume medio día de libre disposición; se puede combinar con medio día de teletrabajo.
  - **Otros** abre un menú con **Días que no caducan** (no cuentan como laborables; se suman con el + del menú ⋯ → Días que no caducan y se gastan al marcarlos), **Médico**, **Bajas** y **Otros** (estos tres cuentan como laborables sin teletrabajo).
  - **Otros** (baja, médico…): cuenta como laborable, pero no como teletrabajo.
- **Días laborables** = días entre semana − festivos − libre disposición − vacaciones (también del año anterior) − días con horas (los medios días libres, la mitad).
- **Días pendientes**: vacaciones del año (21 por defecto), vacaciones del año anterior (hasta el 30 de junio) libre disposición (4 por defecto, caducan el 31 de diciembre) y días que no caducan. Los días de cada año se cambian en el menú ⋯ → Días de vacaciones y libre.
- **Novedades**: tras una actualización, al entrar aparece un aviso con los cambios (con «No volver a mostrar»).
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

En móvil y tablet, al entrar aparece un aviso con estos pasos (adaptados a iPhone/iPad o Android). Sale cada vez hasta que se marca «No mostrar más», y no aparece en escritorio ni cuando la app ya se abre desde el icono de la pantalla de inicio.

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
