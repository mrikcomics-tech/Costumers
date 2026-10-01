const SYNC_URL = "https://script.google.com/macros/s/AKfycbzTA-Qvuzdv6f_YB2jxrreR4wN0tw_m6eacVVD9YDvs1MaNoVLDecBYVmLe3YQFawKijw/exec";
const SYNC_TOKEN = "CM_2026_10_01_9f4d7a6b2e8c1a0f5d3b7e9c2a6f8d1e";

const WILAYAS = ["أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غليزان","غرداية","تيميمون","برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة"];
const ROLES=["معتمر","مسافر","معلن","مرشد"];
const STATUSES=["مؤكد","غير مؤكد"];
const ROOMS=["ثنائية","ثلاثية","رباعية","خماسية","جماعية"];

const $=id=>document.getElementById(id);
function read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
function now(){return new Date().toISOString()}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function newId(prefix){
  if(window.crypto&&crypto.randomUUID)return prefix+"-"+crypto.randomUUID();
  return prefix+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,10).toUpperCase();
}

function initStorage(){
  if(!localStorage.getItem("customers"))write("customers",[]);
  if(!localStorage.getItem("trips"))write("trips",[
    {sync_id:newId("TRIP"),updated_at:now(),deleted:0,data:{type:"trip",name:"عمرة أكتوبر 2026",active:1}}
  ]);
  if(!localStorage.getItem("last_sync"))localStorage.setItem("last_sync","1970-01-01T00:00:00.000Z");
  if(!localStorage.getItem("device_id"))localStorage.setItem("device_id",newId("PHONE"));
}

function openTab(evt,tabName){
  document.querySelectorAll(".tab-content").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab-link").forEach(x=>x.classList.remove("active"));
  $(tabName).classList.add("active");
  if(evt&&evt.currentTarget)evt.currentTarget.classList.add("active");
  if(tabName==="tab-customers")filterCustomers();
  if(tabName==="tab-trips")renderTrips();
}

function populateDropdowns(){
  const fill=(id,arr,all)=>{
    const el=$(id);if(!el)return;
    el.innerHTML=all?'<option value="الكل">الكل</option>':"";
    arr.forEach(x=>el.insertAdjacentHTML("beforeend",`<option value="${esc(x)}">${esc(x)}</option>`));
  };
  fill("f_wilaya",WILAYAS,false);
  fill("filterWilaya",WILAYAS,true);
  fill("f_role",ROLES,false);
  fill("filterRole",ROLES,true);
  fill("f_status",STATUSES,false);
  fill("filterStatus",STATUSES,true);
  fill("f_room",ROOMS,false);
  fill("filterRoom",ROOMS,true);
  updateTripsDropdown();
}

function updateTripsDropdown(){
  const select=$("f_request");if(!select)return;
  const trips=read("trips").filter(t=>!t.deleted&&t.data?.type==="trip"&&t.data.active!==0);
  select.innerHTML="";
  trips.forEach(t=>select.add(new Option(t.data.name,t.data.name)));
  if(!trips.length)select.add(new Option("لا توجد رحلة - استخدم الطلب اليدوي",""));
}

function useManualRequest(){
  const value=$("f_manual_request").value.trim();
  if(!value)return;
  const select=$("f_request");
  let option=[...select.options].find(o=>o.value===value);
  if(!option){option=new Option(value,value);select.add(option)}
  select.value=value;
}

function resetCustomerForm(){
  $("customerForm").reset();
  updateTripsDropdown();
}

function formData(){
  return {
    type:"customer",
    phone:$("f_phone").value.trim(),
    wilaya:$("f_wilaya").value,
    name:$("f_name").value.trim(),
    request:$("f_request").value.trim(),
    role:$("f_role").value,
    status:$("f_status").value,
    people_count:parseInt($("f_count").value||"1",10),
    room:$("f_room").value,
    entry_date:new Date().toISOString().slice(0,10)
  };
}

$("customerForm").addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=formData();
  if(!data.name||!data.phone||!data.wilaya||!data.request){
    alert("يرجى إكمال البيانات المطلوبة.");
    return;
  }

  const editId=form.dataset.editId;
  const customers=read("customers");

  if(editId){
    const idx=customers.findIndex(c=>c.sync_id===editId&&!c.deleted);
    if(idx<0){delete form.dataset.editId;alert("لم يتم العثور على السجل.");return}
    customers[idx]={...customers[idx],updated_at:now(),deleted:0,data};
    delete form.dataset.editId;
    write("customers",customers);
    resetCustomerForm();
    filterCustomers();
    alert("تم تحديث الزبون محلياً.");
  }else{
    customers.push({sync_id:newId("CUSTOMER"),updated_at:now(),deleted:0,data});
    write("customers",customers);
    resetCustomerForm();
    filterCustomers();
    alert("تم حفظ الزبون محلياً.");
  }
  syncData();
});

function filterCustomers(){
  const search=($("searchInput").value||"").trim().toLowerCase();
  const fs=$("filterStatus").value,fr=$("filterRole").value,fo=$("filterRoom").value,fw=$("filterWilaya").value;
  const customers=read("customers").filter(c=>!c.deleted&&c.data?.type==="customer");
  const filtered=customers.filter(c=>{
    const d=c.data||{};
    const text=[d.name,d.phone,d.request,d.wilaya,d.role,d.status,d.room].join(" ").toLowerCase();
    return (!search||text.includes(search))
      &&(fs==="الكل"||d.status===fs)
      &&(fr==="الكل"||d.role===fr)
      &&(fo==="الكل"||d.room===fo)
      &&(fw==="الكل"||d.wilaya===fw);
  }).sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));

  $("recordCount").textContent=filtered.length;
  $("customersList").innerHTML=filtered.length?filtered.map(c=>{
    const d=c.data||{};
    return `<div class="card">
      <h3>${esc(d.name)}</h3>
      <p><strong>الهاتف:</strong> ${esc(d.phone)} | <strong>الولاية:</strong> ${esc(d.wilaya)}</p>
      <p><strong>الطلب:</strong> ${esc(d.request)}</p>
      <p><strong>الحالة:</strong> ${esc(d.status)} | <strong>الدور:</strong> ${esc(d.role)}</p>
      <p><strong>العدد:</strong> ${esc(d.people_count)} | <strong>الغرفة:</strong> ${esc(d.room)}</p>
      <div class="card-actions">
        <button class="edit-btn" onclick="editCustomer('${esc(c.sync_id)}')">تعديل</button>
        <button class="delete-btn" onclick="deleteCustomer('${esc(c.sync_id)}')">حذف</button>
      </div>
    </div>`;
  }).join(""):'<div class="empty">لا توجد سجلات مطابقة.</div>';
}

function clearSearch(){
  $("searchInput").value="";
  $("filterStatus").value="الكل";
  $("filterRole").value="الكل";
  $("filterRoom").value="الكل";
  $("filterWilaya").value="الكل";
  filterCustomers();
}

function editCustomer(syncId){
  const c=read("customers").find(x=>x.sync_id===syncId&&!x.deleted);
  if(!c)return;
  const d=c.data||{};
  $("f_phone").value=d.phone||"";
  $("f_wilaya").value=d.wilaya||"";
  $("f_name").value=d.name||"";
  updateTripsDropdown();
  let option=[...$("f_request").options].find(o=>o.value===d.request);
  if(!option){option=new Option(d.request||"","");$("f_request").add(option)}
  $("f_request").value=d.request||"";
  $("f_role").value=d.role||"";
  $("f_status").value=d.status||"";
  $("f_count").value=d.people_count||1;
  $("f_room").value=d.room||"";
  $("customerForm").dataset.editId=syncId;
  openTab({currentTarget:document.querySelectorAll(".tab-link")[1]},"tab-add");
}

$("customerForm").addEventListener("submit",e=>{
  // listener above performs the common validation/save for additions;
  // this second listener intercepts edit mode before addition logic would create a duplicate.
  const form=e.currentTarget;
  const editId=form.dataset.editId;
  if(!editId)return;
  e.preventDefault();
  e.stopImmediatePropagation();

  const customers=read("customers");
  const idx=customers.findIndex(c=>c.sync_id===editId&&!c.deleted);
  if(idx<0){delete form.dataset.editId;return}

  const old=customers[idx];
  customers[idx]={
    ...old,
    updated_at:now(),
    deleted:0,
    data:formData()
  };
  write("customers",customers);
  delete form.dataset.editId;
  resetCustomerForm();
  filterCustomers();
  alert("تم تحديث الزبون محلياً.");
  syncData();
});

function deleteCustomer(syncId){
  if(!confirm("هل تريد حذف هذا الزبون؟"))return;
  const customers=read("customers");
  const idx=customers.findIndex(c=>c.sync_id===syncId&&!c.deleted);
  if(idx<0)return;
  customers[idx].deleted=1;
  customers[idx].updated_at=now();
  write("customers",customers);
  filterCustomers();
  syncData();
}

function renderTrips(){
  const list=$("tripsList");
  const trips=read("trips").filter(t=>!t.deleted&&t.data?.type==="trip")
    .sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
  list.innerHTML=trips.length?trips.map(t=>`<div class="trip-item"><span>${esc(t.data.name)}</span><button onclick="deleteTrip('${esc(t.sync_id)}')">حذف</button></div>`).join(""):'<div class="empty">لا توجد رحلات.</div>';
}

function addTrip(){
  const name=$("newTripName").value.trim();
  if(!name)return;
  const trips=read("trips");
  if(trips.some(t=>!t.deleted&&t.data?.name===name)){alert("هذه الرحلة موجودة بالفعل.");return}
  trips.push({sync_id:newId("TRIP"),updated_at:now(),deleted:0,data:{type:"trip",name,active:1}});
  write("trips",trips);
  $("newTripName").value="";
  renderTrips();updateTripsDropdown();syncData();
}

function deleteTrip(syncId){
  if(!confirm("هل أنت متأكد من الحذف؟"))return;
  const trips=read("trips");
  const idx=trips.findIndex(t=>t.sync_id===syncId&&!t.deleted);
  if(idx<0)return;
  trips[idx].deleted=1;trips[idx].updated_at=now();
  write("trips",trips);
  renderTrips();updateTripsDropdown();syncData();
}

/*
  الخادم الحالي Code.gs يقبل api_key أو token.
  sync_id ثابت للسجل.
  updated_at يحدد آخر نسخة.
  لا نكتب نسخة الخادم إذا كانت أقدم من المحلية.
*/
async function syncData(){
  const btn=$("syncBtn"),status=$("syncStatusText");
  btn.disabled=true;status.textContent="جاري المزامنة...";

  const since=localStorage.getItem("last_sync")||"1970-01-01T00:00:00.000Z";
  const customers=read("customers"),trips=read("trips");
  const all=[...customers,...trips];

  const changes=all.filter(x=>Date.parse(x.updated_at||"")>Date.parse(since));

  const payload={
    api_key:SYNC_TOKEN,
    token:SYNC_TOKEN,
    action:"sync",
    since,
    device_id:localStorage.getItem("device_id")||"unknown",
    changes
  };

  try{
    const response=await fetch(SYNC_URL,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error("HTTP "+response.status);
    const result=await response.json();
    if(!result.success)throw new Error(result.error||"فشلت المزامنة");

    let localCustomers=read("customers"),localTrips=read("trips");

    for(const serverItem of (result.changes||[])){
      if(!serverItem?.sync_id)continue;
      const isTrip=serverItem.data?.type==="trip";
      const arr=isTrip?localTrips:localCustomers;
      const idx=arr.findIndex(x=>x.sync_id===serverItem.sync_id);

      if(idx<0){
        if(!serverItem.deleted)arr.push(serverItem);
        continue;
      }

      const localTime=Date.parse(arr[idx].updated_at||"1970-01-01T00:00:00.000Z");
      const serverTime=Date.parse(serverItem.updated_at||"1970-01-01T00:00:00.000Z");
      if(serverTime>=localTime)arr[idx]=serverItem;
    }

    write("customers",localCustomers);
    write("trips",localTrips);

    if(result.server_time)localStorage.setItem("last_sync",result.server_time);
    status.textContent="متصل ومتزامن ✓";
    filterCustomers();renderTrips();updateTripsDropdown();
  }catch(error){
    console.error(error);
    status.textContent="وضع عدم الاتصال";
  }finally{
    btn.disabled=false;
  }
}

function forceSync(){
  localStorage.setItem("last_sync","1970-01-01T00:00:00.000Z");
  syncData();
}

function clearLocalCache(){
  if(!confirm("سيتم حذف البيانات المحلية من الهاتف. تأكد أولاً أن آخر التغييرات تمت مزامنتها. هل تريد المتابعة؟"))return;
  localStorage.clear();
  initStorage();populateDropdowns();filterCustomers();renderTrips();
  alert("تم مسح البيانات المحلية وإعادة تهيئتها.");
}

window.addEventListener("load",()=>{
  initStorage();
  populateDropdowns();
  filterCustomers();
  renderTrips();
  syncData();
});
