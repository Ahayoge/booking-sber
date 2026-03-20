import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [count, setCount] = useState("");

  const register = () => {
    try {
      axios.post("http://localhost:3000/api/auth/register", {
        email: "ivan.ivanov54@sber.ru",
        password: "SecurePass123",
        name: "Иван Иванов",
        department: "Отдел разработки",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const login = () => {
    try {
      axios.post("http://localhost:3000/api/auth/login", {
        email: "ivan.ivanov54@sber.ru",
        password: "SecurePass123",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const createRoom = () => {
    try {
      axios.post(
        "http://localhost:3000/api/rooms",
        {
          name: 'Переговорная "Байкал"',
          type: "MEETING_ROOM",
          capacity: 10,
          address: "ул. Вавилова, 19",
          floor: 3,
          equipment: ["проектор", "доска", "микрофоны"],
          photoUrl: "https://cdn.sber.ru/rooms/baikal.jpg",
          status: "ACTIVE",
        },
        {
          headers: {
            Authorization: `Bearer ${count}`,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <button className="counter" onClick={register}>
        Регистрация
      </button>
      <button className="counter" onClick={login}>
        Логин
      </button>
      <button className="counter" onClick={createRoom}>
        Создать комнату
      </button>
      <input
        type="text"
        value={count}
        onChange={(e) => {
          setCount(e.target.value);
        }}
      />
    </>
  );
}

export default App;
