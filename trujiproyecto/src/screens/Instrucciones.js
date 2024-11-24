import React from 'react'

export const Instrucciones = () => {
  return (
    <div class="principal">
        <div class="texto2">
            <h1>Instrucciones</h1>
            <p>Sigue estos sencillos pasos para utilizar el simulador y observar los campos eléctricos generados por las cargas:
            </p>
            <div class="instrucciones">
                <div class="cuadro">1.Ingresar las Cargas:</div>
                <div class="cuadro">2.Configurar las Opciones:</div>
                <div class="cuadro">3.Ejecutar la Simulación:</div>
                <div class="cuadro">4.Modificar o Reiniciar:</div>
            </div>
            <div className='texto4'>
            <p>Consejos:</p>
            <p>Usa diferentes combinaciones de cargas positivas y negativas para observar cómo afectan la forma del campo eléctrico.</p>
            <p>Experimenta con la distancia entre las cargas para ver cómo la proximidad influye en la intensidad del campo.</p>
            </div>
        </div>
    </div>
  )
}
