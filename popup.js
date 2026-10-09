const passengersContainer = document.getElementById("passengers");
const addPassengerButton = document.getElementById("addPassenger");
const savePassengersButton = document.getElementById("savePassengers");
const startButton = document.getElementById("startAutofill");
const journeyTabs = document.getElementById("journeyTabs");
const addJourneyButton = document.getElementById("addJourney");
const fillContactCheckbox = document.getElementById("fillContact");
const contactNumberContainer = document.getElementById("contactNumberContainer");
const contactNumberInput = document.getElementById("contactNumber");
const bookOnlyIfConfirmedCheckbox = document.getElementById(
    "bookOnlyIfConfirmed"
);
const preferredCoachEnabledCheckbox = document.getElementById(
    "preferredCoachEnabled"
);
const preferredCoachContainer = document.getElementById(
    "preferredCoachContainer"
);
const preferredCoachNumberInput = document.getElementById(
    "preferredCoachNumber"
);

const MAX_JOURNEYS = 5;
let journeys = [];
let activeJourneyId = null;

function createJourney(index) {
    return {
        id: `journey-${Date.now()}-${index}`,
        name: `Journey ${index}`,
        passengers: [],
        paymentMode: "2",
        fillContact: false,
        contactNumber: "",
        bookOnlyIfConfirmed: false,
        preferredCoachEnabled: false,
        preferredCoachNumber: ""
    };
}

function createPassengerForm(passenger = {}) {
    const passengerDiv = document.createElement("div");
    passengerDiv.className = "passenger";

    passengerDiv.innerHTML = `
    <h3>Passenger ${passengersContainer.children.length + 1}</h3>
    <input type="text" class="passengerName" placeholder="Full Name">
    <input type="number" class="passengerAge" placeholder="Age">
    <select class="passengerGender">
        <option value="M">Male</option>
        <option value="F">Female</option>
        <option value="T">Transgender</option>
    </select>
    <select class="passengerBerth">
        <option value="">No Preference</option>
        <option value="LB">Lower</option>
        <option value="MB">Middle</option>
        <option value="UB">Upper</option>
        <option value="SL">Side Lower</option>
        <option value="SU">Side Upper</option>
    </select>
    <button class="removePassenger">Remove Passenger</button>
    <hr>
`;

    passengerDiv.querySelector(".passengerName").value = passenger.name || "";
    passengerDiv.querySelector(".passengerAge").value = passenger.age || "";
    passengerDiv.querySelector(".passengerGender").value = passenger.gender || "M";
    passengerDiv.querySelector(".passengerBerth").value = passenger.berth || "";
    passengersContainer.appendChild(passengerDiv);

    passengerDiv.querySelector(".removePassenger").addEventListener("click", () => {
        passengerDiv.remove();
    });
}

function renderJourneyTabs() {
    journeyTabs.innerHTML = "";

    journeys.forEach(journey => {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "journey-tab";
        tab.role = "tab";
        tab.dataset.journeyId = journey.id;
        tab.textContent = journey.name;
        tab.setAttribute(
            "aria-selected",
            String(journey.id === activeJourneyId)
        );
        journeyTabs.appendChild(tab);
    });

    addJourneyButton.disabled = journeys.length >= MAX_JOURNEYS;
}

function toggleContactNumber() {
    contactNumberContainer.hidden = !fillContactCheckbox.checked;
}

function togglePreferredCoach() {
    preferredCoachContainer.hidden = !preferredCoachEnabledCheckbox.checked;
}

function applyJourneyDefaults(journey) {
    let changed = false;

    if (typeof journey.bookOnlyIfConfirmed !== "boolean") {
        journey.bookOnlyIfConfirmed = false;
        changed = true;
    }

    if (typeof journey.preferredCoachEnabled !== "boolean") {
        journey.preferredCoachEnabled = false;
        changed = true;
    }

    if (typeof journey.preferredCoachNumber !== "string") {
        journey.preferredCoachNumber = "";
        changed = true;
    }

    return changed;
}

function renderJourney(journey) {
    passengersContainer.innerHTML = "";
    journey.passengers.forEach(createPassengerForm);

    if (journey.passengers.length === 0) {
        createPassengerForm();
    }

    document.getElementById("paymentMode").value = journey.paymentMode || "2";
    fillContactCheckbox.checked = Boolean(journey.fillContact);
    contactNumberInput.value = journey.contactNumber || "";
    bookOnlyIfConfirmedCheckbox.checked = Boolean(journey.bookOnlyIfConfirmed);
    preferredCoachEnabledCheckbox.checked = Boolean(journey.preferredCoachEnabled);
    preferredCoachNumberInput.value = journey.preferredCoachNumber || "";
    toggleContactNumber();
    togglePreferredCoach();
}

function getActiveJourney() {
    return journeys.find(journey => journey.id === activeJourneyId);
}

function collectJourneyData() {
    const passengerForms = document.querySelectorAll(".passenger");

    if (passengerForms.length === 0) {
        alert("Please add at least one passenger.");
        return null;
    }

    const passengers = [];
    let lowerBerthCount = 0;

    for (const form of passengerForms) {
        const name = form.querySelector(".passengerName").value.trim();
        const age = Number(form.querySelector(".passengerAge").value);
        const gender = form.querySelector(".passengerGender").value;
        const berth = form.querySelector(".passengerBerth").value;

        if (!name) {
            alert("Please enter the passenger name.");
            return null;
        }

        if (!age || age < 1 || age > 120) {
            alert(`Please enter a valid age for ${name}.`);
            return null;
        }

        if (berth === "LB") {
            lowerBerthCount++;
        }

        if (lowerBerthCount > 2) {
            alert("You can select Lower berth for a maximum of 2 passengers.");
            return null;
        }

        passengers.push({ name, age, gender, berth });
    }

    const fillContact = fillContactCheckbox.checked;
    const contactNumber = contactNumberInput.value.trim();

    if (fillContact && !/^\d{10}$/.test(contactNumber)) {
        alert("Please enter a valid 10-digit contact number.");
        return null;
    }

    const preferredCoachEnabled = preferredCoachEnabledCheckbox.checked;
    const preferredCoachNumber = preferredCoachNumberInput.value.trim();

    if (preferredCoachEnabled && !preferredCoachNumber) {
        alert("Please enter a preferred coach number.");
        return null;
    }

    return {
        passengers,
        paymentMode: document.getElementById("paymentMode").value,
        fillContact,
        contactNumber: fillContact ? contactNumber : "",
        bookOnlyIfConfirmed: bookOnlyIfConfirmedCheckbox.checked,
        preferredCoachEnabled,
        preferredCoachNumber: preferredCoachEnabled ? preferredCoachNumber : ""
    };
}

addPassengerButton.addEventListener("click", () => createPassengerForm());
fillContactCheckbox.addEventListener("change", toggleContactNumber);
preferredCoachEnabledCheckbox.addEventListener("change", togglePreferredCoach);

journeyTabs.addEventListener("click", event => {
    const tab = event.target.closest(".journey-tab");

    if (!tab) {
        return;
    }

    activeJourneyId = tab.dataset.journeyId;
    renderJourneyTabs();
    renderJourney(getActiveJourney());
});

addJourneyButton.addEventListener("click", () => {
    if (journeys.length >= MAX_JOURNEYS) {
        return;
    }

    const journey = createJourney(journeys.length + 1);
    journeys.push(journey);
    activeJourneyId = journey.id;
    renderJourneyTabs();
    renderJourney(journey);
});

savePassengersButton.addEventListener("click", async () => {
    const journeyData = collectJourneyData();

    if (!journeyData) {
        return;
    }

    const activeJourney = getActiveJourney();
    Object.assign(activeJourney, journeyData);

    await chrome.storage.local.set({
        journeys,
        lastSavedJourneyId: activeJourneyId
    });

    alert(`${activeJourney.name} saved successfully.`);
});

startButton.addEventListener("click", async () => {
    const result = await chrome.storage.local.get(["journeys"]);
    const journey = (result.journeys || []).find(
        item => item.id === activeJourneyId
    );

    if (!journey || journey.passengers.length === 0) {
        alert("Save this journey before starting autofill.");
        return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.startsWith("https://www.irctc.co.in/")) {
        alert("Open the supported IRCTC passenger page before autofilling.");
        return;
    }

    try {
        const result = await chrome.tabs.sendMessage(tab.id, {
            type: "AUTOFILL_NOW",
            passengers: journey.passengers,
            paymentMode: journey.paymentMode,
            fillContact: journey.fillContact,
            contactNumber: journey.contactNumber,
            bookOnlyIfConfirmed: journey.bookOnlyIfConfirmed,
            preferredCoachEnabled: journey.preferredCoachEnabled,
            preferredCoachNumber: journey.preferredCoachNumber
        });

        if (!result || !result.ok) {
            alert(result?.error || "IRCTC autofill could not be started on this page.");
        } else if (result.warnings?.length) {
            alert(`Autofill continued with limitations:\n${result.warnings.join("\n")}`);
        }
    } catch (error) {
        alert("IRCTC autofill is unavailable on this page. Reload the supported passenger page and try again.");
    }
});

async function loadJourneys() {
    const result = await chrome.storage.local.get([
        "journeys",
        "lastSavedJourneyId",
        "passengers",
        "paymentMode"
    ]);

    journeys = result.journeys || [];
    const journeyDefaultsAdded = journeys.reduce(
        (changed, journey) => applyJourneyDefaults(journey) || changed,
        false
    );

    if (journeys.length === 0 && result.passengers && result.passengers.length > 0) {
        const migratedJourney = createJourney(1);
        migratedJourney.passengers = result.passengers;
        migratedJourney.paymentMode = result.paymentMode || "2";
        journeys = [migratedJourney];
        activeJourneyId = migratedJourney.id;
        await chrome.storage.local.set({
            journeys,
            lastSavedJourneyId: activeJourneyId
        });
    }

    if (journeys.length === 0) {
        const journey = createJourney(1);
        journeys = [journey];
        activeJourneyId = journey.id;
    } else {
        activeJourneyId = journeys.some(journey => journey.id === result.lastSavedJourneyId)
            ? result.lastSavedJourneyId
            : journeys[0].id;
    }

    if (journeyDefaultsAdded) {
        await chrome.storage.local.set({ journeys });
    }

    renderJourneyTabs();
    renderJourney(getActiveJourney());
}

loadJourneys();
