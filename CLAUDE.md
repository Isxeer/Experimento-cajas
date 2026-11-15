# Juego de las Cajas de Inversión

Experimento de clase (Neurociencia y Psicología) sobre **aversión a la pérdida** y **condicionamiento aversivo**. Web estática sin dependencias: `index.html`, `styles.css`, `app.js`. Se abre directo en el navegador (celular o PC).

## Diseño experimental
- 15 rondas, puntaje inicial 50. Asignación aleatoria 50/50 a **Control** o **Experimental** (forzable con el panel oculto del docente —5 toques en el título o Ctrl+Shift+G— o con `?grupo=control|experimental`).
- **Fase 1 (rondas 1–3):** ganancias normales (+3 a +6). En el grupo Experimental, la Caja Azul da +15 en la ronda 1 y **−30 con estímulo aversivo** (alarma roja, buzzer, vibración) en la ronda 2. La ronda 2 obliga a elegir Azul en **ambos** grupos, para que la única diferencia sea el resultado.
- **Transición:** pantalla de "sistema reiniciado" con las nuevas reglas y 10 s de lectura mínima.
- **Fase 2 (rondas 4–15), reglas informadas:** Azul 70% +10 / 30% −5 (VE 5,5); Roja 90% +4 / 10% −1 (VE 3,5).
- **Variables dependientes:** % de elección de Azul en Fase 2 y tiempo de reacción (capturado en `pointerdown`).
- Al final: debriefing según el grupo.

## Datos
- Envío automático a Google Apps Script (`CONFIG.urlServidor` en `app.js`), en modo CORS: solo muestra ✅ si `resp.ok`.
- CSV con `;` y coma decimal (para Excel en español), una fila por ronda más una fila RESUMEN.
- Respaldo en `localStorage`, descargable desde el panel del docente.
- Todos los parámetros se editan en el objeto `CONFIG` al inicio de `app.js`.

## Forma de trabajo
- Responder siempre en **español**.
- **Antes de editar**, presentar una lista numerada de los cambios propuestos (qué, dónde, por qué, riesgo) y esperar que el usuario apruebe o rechace cada punto. Aplicar solo lo aprobado.
- Cualquier cambio debe preservar la comparabilidad entre grupos: la única diferencia debe ser la pérdida y el estímulo aversivo de la ronda 2.
- Los estímulos visuales deben mantenerse por debajo de 3 destellos por segundo (fotosensibilidad).

## Pendiente
- Verificar con una partida real que el Apps Script devuelve una respuesta legible por CORS (si no, el final dirá "no se pudo confirmar" aunque los datos lleguen).
