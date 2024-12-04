import './App.css';
import { BrowserRouter, Routes, Route} from 'react-router-dom'
import Navbar from './components/Navbar';
import { Introduccion } from './screens/Introduccion';
import { Instrucciones } from './screens/Instrucciones';
import { Teoria } from './screens/Teoria';
import { SobreElProyecto } from './screens/SobreElProyecto';
import {Simulador} from './screens/Simulador';


function App() {
  return (
    <BrowserRouter>
    <div className="App">
      <header className="App-header">
        < Navbar/>
      </header>
      <div class="box"></div>
    </div>
      <div className=''>
        <Routes>
        <Route path='/Introducion' element={<Introduccion/>}></Route>
        <Route path='/Instrucciones' element={<Instrucciones/>}></Route>
        <Route path='/Teoria' element={<Teoria/>}>
        </Route>
        <Route path='/Simulador' element={<Simulador/>}>
        </Route>
        <Route path='/SobreElProyecto' element={<SobreElProyecto/>}>
        </Route>
        </Routes>
      </div>
      </BrowserRouter>
    
  );
}

export default App;
