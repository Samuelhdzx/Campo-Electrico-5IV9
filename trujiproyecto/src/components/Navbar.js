import React from 'react'
const Navbar = () => {
  return (
    <div class="contenedor">
           <img src="logotipo_ipn.png" class="logo" alt=''/>

           <a href="/Introducion"><div class="menu">Inicio</div></a>
           <a href="/Instrucciones"><div class="menu">Instrucciones</div></a>
           <a href="/Teoria"><div class="menu">Teoría</div></a>
           <a href="/Simulador"><div class="menu">Simulador</div></a>
           <a href="/SobreElProyecto"><div class="menu">Sobre el proyechref</div></a> 
    </div>
     
  )
}

export default Navbar;