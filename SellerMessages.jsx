import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";

import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./SellerMessages.css";


function SellerMessages(){


const [messages,setMessages]=useState([]);

const navigate = useNavigate();



useEffect(()=>{


const user = auth.currentUser;


if(!user) return;



const q=query(

collection(db,"messages"),

where(
"sellerId",
"==",
user.uid
),

orderBy(
"createdAt",
"desc"
)

);



const unsubscribe = onSnapshot(q,(snapshot)=>{


const data=snapshot.docs.map(doc=>({

id:doc.id,

...doc.data()

}));


setMessages(data);


});



return ()=>unsubscribe();



},[]);





return(


<div className="seller-messages">


<h1>
💬 Seller Messages
</h1>



{

messages.length === 0 ?


<p>
No messages yet 🌾
</p>



:


messages.map(message=>(


<div
className="message-card"
key={message.id}
>



<h3>

Product:
{message.productName}

</h3>


<p>

Buyer:

{message.senderEmail}

</p>



<p>

{message.text}

</p>



<button

onClick={()=>navigate("/chat",{

state:{

product:{
id:message.productId,
name:message.productName
},

sellerId:message.sellerId

}

})}

>

Reply 💬

</button>



</div>


))


}



</div>


);


}


export default SellerMessages;