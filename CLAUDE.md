# Juego de las Cajas de Inversión

Experimento de clase (Neurociencia y Psicología) sobre **aversión a la pérdida** y **condicionamiento aversivo**. Web estática sin dependencias: `index.html`, `styles.css`, `app.js`. Se abre directo en el navegador (celular o PC).

## Diseño experimental
- 15 rondas, puntaje inicial 50. Asignación aleatoria 50/50 a **Control** o **Experimental** (forzable con el panel oculto del docente —5 toques en el título o Ctrl+Shift+G— o con un código discreto en la URL: `?v=0C` / `?v=1C` → Control, `?v=0E` / `?v=1E` → Experimental; el número es solo de relleno). El antiguo `?grupo=` ya no funciona, a propósito.
- **Fase 1 (rondas 1–8):** ganancias normales (+3 a +6). En el grupo Experimental, la Caja Azul da +15 en la ronda 1 y **−30 con estímulo aversivo** (alarma roja, buzzer, vibración) en la **ronda trampa (7)**. La ronda 7 obliga a elegir Azul en **ambos** grupos, para que la única diferencia sea el resultado. La trampa debe quedar siempre **antes** de la pantalla de reinicio: si ocurriera después, el −30 contradiría las reglas informadas.
- **Transición (después de la ronda 8):** pantalla de "sistema reiniciado" con las nuevas reglas y 10 s de lectura mínima.
- **Fase 2 (rondas 9–15, 7 rondas), reglas informadas:** Azul 70% +10 / 30% −5 (VE 5,5); Roja 90% +4 / 10% −1 (VE 3,5).
- **Historial de rondas:** debajo de las cajas, una celda por ronda jugada (ronda, caja elegida, puntos). Igual en ambos grupos y visible también en la Fase 2, incluido el −30. Color del puntaje: pérdidas en rojo cada vez más intenso según su tamaño (−1 suave, −5 medio, −30 intenso); ganancias en verde, siempre más apagado que el rojo.
- **Variables dependientes:** % de elección de Azul en Fase 2 y tiempo de reacción (capturado en `pointerdown`).
- Al final: debriefing según el grupo.
- Los números de rondas de los textos (instrucciones, contador, pantalla de reinicio, debriefing) salen de `CONFIG` (`totalRondas`, `rondasFase1`, `rondaTrampa`).

## Datos
- Envío automático a Google Apps Script (`CONFIG.urlServidor` en `app.js`), en modo CORS: solo muestra ✅ si `resp.ok`.
- CSV con `;` y coma decimal (para Excel en español), una fila por ronda más una fila RESUMEN. La fila RESUMEN incluye "Puntos Fase 2" (suma de rondas 9–15), que es la métrica correcta para comparar puntajes entre grupos sin el sesgo del −30.
- El Apps Script recibe `{ filaResumen: [...] }` (22 columnas: fecha, ID, grupo, puntaje final, % Azul F2, TR prom F2, las 15 elecciones, y los 7 TR de la Fase 2 separados por " | ") y hace `appendRow`. Se pueden borrar filas de la planilla sin romper nada, pero no la pestaña ni el archivo.
- Respaldo en `localStorage`, descargable desde el panel del docente.
- Todos los parámetros se editan en el objeto `CONFIG` al inicio de `app.js`.

## Forma de trabajo
- Responder siempre en **español**.
- **Antes de editar**, presentar una lista numerada de los cambios propuestos (qué, dónde, por qué, riesgo) y esperar que el usuario apruebe o rechace cada punto. Aplicar solo lo aprobado.
- Cualquier cambio debe preservar la comparabilidad entre grupos: la única diferencia debe ser la pérdida y el estímulo aversivo de la ronda trampa (7).
- Los estímulos visuales deben mantenerse por debajo de 3 destellos por segundo (fotosensibilidad).

## Historial de decisiones (no revertir sin preguntar)
- **Fase 2:** el diseño original (y la propuesta PDF v2) era Azul 80/20 y Roja +4 seguro. El grupo lo cambió a Azul 70/30 y Roja 90% +4 / 10% −1. **El juego manda**; la propuesta en PDF está desactualizada en ese punto.
- **Trampa en la ronda 7 (antes era la 2):** el usuario la movió el 2026-11-16. Eligió mantener 15 rondas (Fase 1 = 1–8, Fase 2 = 9–15) en vez de alargar a 20 rondas para conservar 12 rondas medidas. El +15 de la Azul sigue en la ronda 1.
- **Ronda trampa forzada:** la Caja Roja se ve normal (sin candado ni aviso); si la tocan solo tiembla un poco y no cuenta como respuesta.
- **Historial de rondas con escala de color:** pedido del usuario, para que tengan presente en qué caja perdieron.
- **Botón "Siguiente":** espera 0,45 s (se redujo a la mitad a pedido del usuario).
- **Destello rojo translúcido (22%)** en cualquier pérdida de puntos, salvo el −30 de la ronda trampa, que ya tiene la alerta fuerte.
- **Estética:** minimalista, tonos negros, bordes en punta, letra Montserrat. Las cajas siguen azul y roja porque son los estímulos.
- **Envío:** originalmente era `mode: 'no-cors'` (pedido del usuario); se cambió a CORS para poder confirmar el registro.
- **Documentos del grupo** (propuesta y consentimiento para apoderados): los edita el grupo, no Claude.

## Ideas propuestas, sin decidir
No implementar sin aprobación. Las cuatro recomendadas:
1. Pregunta de comprensión en la transición ("¿qué caja da más puntos en promedio?").
2. Secuencia fija de resultados en la Fase 2 (misma secuencia de ganancias y pérdidas para todos, sin pérdidas de la Azul al inicio).
3. Ganarse los 50 puntos iniciales con una tarea breve de esfuerzo, más rifa por puntos (puede chocar con lo decidido sobre los dulces en el consentimiento).
4. Preguntas finales "saber contra sentir": probabilidad percibida de pérdida de la Azul y riesgo sentido (1–7).

Otras: amenaza de quiebra en 0 puntos, sonido propio de la Caja Azul, suspenso de ~1 s antes del resultado, registrar tipo de dispositivo, análisis por bloques dentro de la Fase 2, TR solo en elecciones de Azul.

## Pendiente
- **Error detectado, sin corregir (falta aprobación del usuario):** las reglas de la Fase 2 ("Azul: 70% → +10…") se ven bajo las cajas también durante la Fase 1. Causa: `.reglas-mini { display: flex }` en `styles.css` anula el atributo `hidden`. Arreglo propuesto: agregar `.reglas-mini[hidden] { display: none; }`.
- La propuesta y el consentimiento del grupo todavía mencionan la ronda 2 y las rondas 4–15 (los actualiza el grupo).
- Verificado el 2026-11-15: el envío en modo CORS funciona con el Apps Script real (aparece ✅ y la fila llega bien a la planilla).
