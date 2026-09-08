import { useNavigate } from "react-router-dom";
import "./Suppliers.css";


function Suppliers(){


const navigate = useNavigate();


return (

<div className="suppliers-page">


<section className="supplier-hero">


<h1>
🌾 Agrobaz Suppliers
</h1>


<p>
Meet verified agricultural suppliers.
</p>


<p>
Grow your farm business with global buyers.
</p>


</section>





<section className="supplier-section">


<h2>
👨‍🌾 Become an Agrobaz Supplier
</h2>


<div className="supplier-grid">


<div>
🌽
<h3>Crops</h3>
<p>
Sell agricultural products globally.
</p>
</div>



<div>
🌱
<h3>Seeds</h3>
<p>
Connect with farmers and buyers.
</p>
</div>



<div>
🚜
<h3>Equipment</h3>
<p>
Trade agricultural machinery.
</p>
</div>



</div>


</section>







<section className="supplier-section">


<h2>
Why Join Agrobaz?
</h2>


<ul>

<li>✔ Global buyers</li>

<li>✔ Verified supplier profiles</li>

<li>✔ Secure payments</li>

<li>✔ Logistics support</li>

</ul>


</section>







<section className="supplier-section">


<h2>
How It Works
</h2>


<div className="steps">


<p>
1️⃣ Create supplier profile
</p>


<p>
2️⃣ Add your products
</p>


<p>
3️⃣ Receive buyer requests
</p>


<p>
4️⃣ Complete sales
</p>


</div>


</section>







<button

onClick={()=>navigate("/register")}

>

Join Agrobaz 🌾

</button>




</div>

);


}


export default Suppliers;