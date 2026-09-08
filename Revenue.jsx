import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import "./Revenue.css";


function Revenue() {


  const [revenue, setRevenue] = useState({

    orders: 0,

    sales: 0,

    commission: 0

  });




  useEffect(()=>{


    async function getRevenue(){


      const ordersQuery = query(

        collection(db,"orders"),

        where("status","==","Completed")

      );



      const snapshot = await getDocs(ordersQuery);



      let sales = 0;

      let commission = 0;

      let count = 0;




      snapshot.forEach((doc)=>{


        const data = doc.data();



        count++;


        sales += Number(data.price || 0);


        commission += Number(data.commission || 0);



      });




      setRevenue({

        orders: count,

        sales: sales,

        commission: commission


      });



    }



    getRevenue();



  }, []);






  return (


    <div className="revenue">


      <h1>
        Agrobaz Revenue 💰
      </h1>



      <div className="revenue-grid">


        <div className="revenue-card">

          <h2>
            Completed Orders
          </h2>

          <p>
            {revenue.orders}
          </p>

        </div>




        <div className="revenue-card">

          <h2>
            Total Sales
          </h2>

          <p>
            ${revenue.sales}
          </p>

        </div>





        <div className="revenue-card">

          <h2>
            Agrobaz Commission
          </h2>

          <p>
            ${revenue.commission}
          </p>

        </div>



      </div>


    </div>


  );


}


export default Revenue;