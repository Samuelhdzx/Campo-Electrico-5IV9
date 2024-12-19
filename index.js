
import express from "express";
import morgan from "morgan";
//fix_dirname
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));


    
    //SERVER: se establece una constante de la clase importada express
    const app = express();
    //se establece que el puerto sea 4000
    app.set("port", 4000);
    //Cuando el puerto se conecte envia un mensaje a la terminal
    app.listen(app.get("port"));
    console.log("Servidor corriente en un puerto"+ app.get("port"));
    
     // m
    //CONFIGURACION
    //Se usa la lubreria mirgan para establecer el ip
    app.use(morgan('dev'))
    //La app usa el metodo json de la clase express
    app.use(express.static(__dirname+"/public"))
    app.use(express.json())
    //RUTITAS:Se establecen los ruteos a todas las páginas y archivos js
    
    app.get("/", (req,res)=> res.sendFile(__dirname+"/paginas/index2.html"))
    app.get("/introduccion", (req,res)=> res.sendFile(__dirname+"/paginas/Introducion.html"))
    
    //pkill node sirve para reiniciar todo :D
    //npm i bcrypt cookie-parser cors dotenv express jsonwebtoken mysql2 morgan nodemon
    //ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'n0m3l0';