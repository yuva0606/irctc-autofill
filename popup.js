const passengersContainer = document.getElementById("passengers");
const addPassengerButton = document.getElementById("addPassenger");
const savePassengersButton = document.getElementById("savePassengers");
const startButton = document.getElementById("startAutofill");

let passengers = [];


function createPassengerForm(passenger = {}) {

    const passengerDiv = document.createElement("div");

    passengerDiv.className = "passenger";

    passengerDiv.innerHTML = `
    <h3>Passenger ${passengersContainer.children.length + 1}</h3>

    <input
        type="text"
        class="passengerName"
        placeholder="Full Name"
        value="${passenger.name || ""}"
    >

    <input
        type="number"
        class="passengerAge"
        placeholder="Age"
        value="${passenger.age || ""}"
    >

    <select class="passengerGender">
        <option value="M">Male</option>
        <option value="F">Female</option>
        <option value="T">Transgender</option>
    </select>

    <select class="passengerBerth">
        <option value="LB">Lower</option>
        <option value="MB">Middle</option>
        <option value="UB">Upper</option>
        <option value="SL">Side Lower</option>
        <option value="SU">Side Upper</option>
    </select>

    <button class="removePassenger">
        Remove Passenger
    </button>

    <hr>
`;

    passengersContainer.appendChild(passengerDiv);
    const removeButton =
        passengerDiv.querySelector(".removePassenger");

    removeButton.addEventListener("click", () => {
        passengerDiv.remove();
    });
}


addPassengerButton.addEventListener("click", () => {
    createPassengerForm();
});


savePassengersButton.addEventListener("click", async () => {

    const passengerForms =
        document.querySelectorAll(".passenger");

    if (passengerForms.length === 0) {
        alert("Please add at least one passenger.");
        return;
    }

    const passengers = [];
    let lowerBerthCount = 0;

    for (const form of passengerForms) {

        const name =
            form.querySelector(".passengerName").value.trim();

        const age =
            Number(form.querySelector(".passengerAge").value);

        const gender =
            form.querySelector(".passengerGender").value;

        const berth =
            form.querySelector(".passengerBerth").value;


        if (!name) {
            alert("Please enter the passenger name.");
            return;
        }

        if (!age || age < 1 || age > 120) {
            alert(`Please enter a valid age for ${name}.`);
            return;
        }

        if (berth === "LB") {
            lowerBerthCount++;
        }

        if (lowerBerthCount > 2) {
            alert(
                "You can select Lower berth for a maximum of 2 passengers."
            );
            return;
        }

        passengers.push({
            name: name,
            age: age,
            gender: gender,
            berth: berth
        });
    }

    const paymentMode =
        document.getElementById("paymentMode").value;




    await chrome.storage.local.set({
        passengers: passengers,
        paymentMode: paymentMode
    });

    console.log("Passengers saved:", passengers);

    alert("Passengers saved successfully.");
});


startButton.addEventListener("click", async () => {

    const result =
        await chrome.storage.local.get([
            "passengers",
            "paymentMode"
        ]);

    const passengers = result.passengers;
    const paymentMode = result.paymentMode;

    if (!passengers || passengers.length === 0) {
        console.log("No passengers saved");
        return;
    }

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    chrome.tabs.sendMessage(tab.id, {
        type: "AUTOFILL_NOW",
        passengers: passengers,
        paymentMode: paymentMode
    });
});


async function loadPassengers() {

    const result = await chrome.storage.local.get("passengers");

    const savedPassengers = result.passengers;

    if (!savedPassengers || savedPassengers.length === 0) {
        createPassengerForm();
        return;
    }

    savedPassengers.forEach(passenger => {
        createPassengerForm(passenger);
    });
}

loadPassengers();