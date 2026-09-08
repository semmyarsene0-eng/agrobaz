import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
collection,
addDoc,
query,
where,
orderBy,
onSnapshot,
serverTimestamp
} from "firebase/firestore";

import { db, auth } from "../firebase";
import "./Chat.css";


function Chat(){


const location = useLocation();


const {product,sellerId}=location.state;



const [messages,setMessages]=useState("");

const [chatMessages,setChatMessages]=useState([]);




useEffect(()=>{


const q=query(

collection(db,"messages"),

where(
"productId",
"==",
product.id
),

orderBy(
"createdAt",
"asc"
)

);



const unsubscribe = onSnapshot(q,(snapshot)=>{


const data=snapshot.docs.map(doc=>({

id:doc.id,

...doc.data()

}));


setChatMessages(data);


});



return ()=>unsubscribe();



},[product.id]);







async function sendMessage(){


const user=auth.currentUser;



if(!user)return;


if(!messages.trim())return;



await addDoc(

collection(db,"messages"),{


senderId:user.uid,


text:messages,


productId:product.id,


sellerId:sellerId,


createdAt:serverTimestamp()


}

);



setMessages("");



}





return(


<div className="chat-page">


<h1>
💬 {product.name}
</h1>



<div className="chat-box">


{

chatMessages.map(msg=>(


<div key={msg.id}>


<p>

{msg.text}

</p>


</div>


))


}


</div>





<div className="chat-input">


<input

value={messages}

onChange={
e=>setMessages(e.target.value)
}

placeholder="Write message..."

/>


<button onClick={sendMessage}>

Send 🚀

</button>


</div>



</div>


);


}


export default Chat;