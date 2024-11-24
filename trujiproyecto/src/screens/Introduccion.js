import React from 'react'
export const Introduccion = () => {
  return (
    <div class="principal">
    <div class="texto1">
        <h1>Simulador de Campo Eléctrico</h1>
        <h2>Visualiza y comprende el comportamiento de los campos eléctricos generados por múltiples cargas puntuales. 
            Ingresa hasta tres cargas de diferentes magnitudes y signos, para observar cómo se distribuyen las líneas de campo en el espacio, 
            y cómo interactúan entre sí.</h2>
        <div class="Botones">
            <div> <a href="/Simulador"><button class="boton1">Iniciar simulación</button></a></div>
            <div> <a href="/Instrucciones"><button class="boton2">Instrucciones</button></a></div>
            
        </div>
    </div>
    <div class="imagen">
        <br/><br/><br/><br/><br/><br/>
        <img src="Campo_electrico.png"/>
    </div>
</div>
  )
}
