import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './Components/Home/Home'
import Sell from "./Components/SellPage/sell";
import './App.css'


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/sell" element={<Sell/>} />
      </Routes>
    </Router>
  );
}
