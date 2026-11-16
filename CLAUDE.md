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
- CSV con `;` y coma decimal (para Excel en español), una fila por ronda más una fila RESUMEN. La fila RESUMEN incluye "Puntos Fase 2" (suma de rondas 4–15), que es la métrica correcta para comparar puntajes entre grupos sin el sesgo del −30.
- El Apps Script recibe `{ filaResumen: [...] }` (22 columnas: fecha, ID, grupo, puntaje final, % Azul F2, TR prom F2, las 15 elecciones, y los 12 TR de la Fase 2 separados por " | ") y hace `appendRow`. Se pueden borrar filas de la planilla sin romper nada, pero no la pestaña ni el archivo.
- Respaldo en `localStorage`, descargable desde el panel del docente.
- Todos los parámetros se editan en el objeto `CONFIG` al inicio de `app.js`.

## Forma de trabajo
- Responder siempre en **español**.
- **Antes de editar**, presentar una lista numerada de los cambios propuestos (qué, dónde, por qué, riesgo) y esperar que el usuario apruebe o rechace cada punto. Aplicar solo lo aprobado.
- Cualquier cambio debe preservar la comparabilidad entre grupos: la única diferencia debe ser la pérdida y el estímulo aversivo de la ronda 2.
- Los estímulos visuales deben mantenerse por debajo de 3 destellos por segundo (fotosensibilidad).

## Historial de decisiones (no revertir sin preguntar)
- **Fase 2:** el diseño original (y la propuesta PDF v2) era Azul 80/20 y Roja +4 seguro. El grupo lo cambió a Azul 70/30 y Roja 90% +4 / 10% −1. **El juego manda**; la propuesta en PDF está desactualizada en ese punto.
- **Ronda 2 forzada:** la Caja Roja se ve normal (sin candado ni aviso); si la tocan solo tiembla un poco y no cuenta como respuesta.
- **Botón "Siguiente":** espera 0,45 s (se redujo a la mitad a pedido del usuario).
- **Destello rojo translúcido (22%)** en cualquier pérdida de puntos, salvo el −30 de la ronda 2, que ya tiene la alerta fuerte.
- **Estética:** minimalista, tonos negros, bordes en punta, letra Montserrat. Las cajas siguen azul y roja porque son los estímulos.
- **Envío:** originalmente era `mode: 'no-cors'` (pedido del usuario); se cambió a CORS para poder confirmar el registro.
- **Documentos del grupo** (propuesta y consentimiento para apoderados): los edita el grupo, no Claude.

## Ideas propuestas, sin decidir
No implementar sin aprobación. Las cuatro recomendadas:
1. Pregunta de comprensión en la transición ("¿qué caja da más puntos en promedio?").
2. Secuencia fija de resultados en la Fase 2 (4 pérdidas de la Azul en 12 rondas, ninguna al inicio; 1 pérdida de la Roja).
3. Ganarse los 50 puntos iniciales con una tarea breve de esfuerzo, más rifa por puntos (puede chocar con lo decidido sobre los dulces en el consentimiento).
4. Preguntas finales "saber contra sentir": probabilidad percibida de pérdida de la Azul y riesgo sentido (1–7).

Otras: amenaza de quiebra en 0 puntos, sonido propio de la Caja Azul, suspenso de ~1 s antes del resultado, historial visible de rondas, registrar tipo de dispositivo, análisis por bloques (4–7, 8–11, 12–15), TR solo en elecciones de Azul.

## Pendiente
- Verificar con una partida real que el Apps Script devuelve una respuesta legible por CORS (si no, el final dirá "no se pudo confirmar" aunque los datos lleguen).
