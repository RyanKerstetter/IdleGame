window.GameData = {
  upgrades: null,        // JSON-backed class instance
  loaded: false
};

window.GameState = {
  mana: 0,
  research: 0,
  manaProgress: 0,
  upgrades : {},
  lastTick: Date.now()
}

class UpdateManager {
  constructor() {
    this.updatables = [];
  }

  add(updateFn) {
    this.updatables.push(updateFn);
  }

  remove(updateFn) {
    this.updatables = this.updatables.filter(fn => fn !== updateFn);
  }

  tick() {
    // run all registered update functions
    this.updatables.forEach(fn => fn());
  }
}

const upgradeUpdateManager = new UpdateManager();

class RequirementData {
  constructor(obj){
    console.log("Creating requirementData from:");
    console.log(JSON.stringify(obj, null, 2));
    this.id = obj.id;
    this.amount  = obj.amount;
    console.log("Id:" + this.id + " amount:" + this.amount);
  }

  Check(){
    console.log("Checking : " + this.name + " for amount: " + this.amount);
    return GameState.upgrades[this.id] >= this.amount;
  }
}

class UpgradeData {
  constructor(obj){
    this.id = obj.id;
    this.name = obj.name;
    this.description = obj.description;
    this.cost = obj.cost;
    this.scale = obj.scale;
    this.max_upgrades = obj.max_upgrades;
    this.cost_resource = obj.cost_resource
    this.requirements = (obj.requirements ?? []).map(r => new RequirementData(r));
  }

  GetCost(){
    const currentAmount = getUpgradeAmount(this.id);
    const currentCost = this.cost * this.scale ** currentAmount;
    return currentCost;
  }

  CanAfford(){
    const resourceCost = this.GetCost();
    if(this.cost_resource == "mana"){
      return GameState.mana >= resourceCost;
    } else if(this.cost_resource == "research"){
      return GameState.research >= resourceCost;
    } else {
      console.log("Unidentifies resource cost" + this.cost_resource);
    }
  }

  Buy(){
    if(!this.CanAfford()){
      return false;
    }
    const resourceCost = this.GetCost()
    if(this.cost_resource == "mana"){
      GameState.mana -= resourceCost;
    } else if(this.cost_resource == "research"){
      GameState.research -= resourceCost;
    } else {
      console.log("Unidentifies resource cost buy" + this.cost_resource);
    }

    GameState.upgrades[this.id] = getUpgradeAmount(this.id) + 1;
    console.log("New: " + this.id + " " + getUpgradeAmount(this.id))

    upgradeUpdateManager.tick()
  }
}

class TierData {
  constructor(obj){
    this.id = obj.id;
    this.name = obj.name;
    this.upgrades = (obj.upgrades ?? []) . map(r => new UpgradeData(r));
    this.research = (obj.research ?? []) . map(r => new UpgradeData(r));
  }
}

function getUpgradeAmount(upgradeID){
  if(GameState.upgrades[upgradeID] == undefined){
    GameState.upgrades[upgradeID] = 0;
  }
  return GameState.upgrades[upgradeID];
}

function loadGame() {
  const raw = localStorage.getItem("idleGameSave");
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    GameState.mana = data.mana;
    GameState.upgrades = (data.upgrades ?? {});
    const now = Date.now();
    const delta = (now - data.lastTick);

  } catch (e) {
    console.warn("Save corrupted, starting fresh");
  }
}

function saveGame() {
  const saveData = {
    mana: GameState.mana,
    upgrades: GameState.upgrades,
    lastTick: Date.now(),
  }
  localStorage.setItem("idleGameSave", JSON.stringify(saveData));
}


async function loadGameData() {
  const res = await fetch("upgrades.json");
  const json = await res.json();

  GameData.upgrades = json.tiers.map(t => new TierData(t)); // your class
  GameData.loaded = true;
}

function startGame() {
  generateUpgradeUI();
  generateManaBars();
  requestAnimationFrame(gameLoop);
}


var lastTime = Date.now()

loadGameData().then(startGame);

const manaEl = document.getElementById("mana");
const manaBarsEl = document.getElementById("mana-bars");

function format(value) {
    const SCI_THRESHOLD = 1e6;

    if (Math.abs(value) < SCI_THRESHOLD) {
        if (value < 1) return value.toFixed(2);
        return Math.floor(value).toString();
    }

    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);

    return mantissa.toFixed(2) + "e" + exponent;
}

function createUpgradePanel(upgradeData) {
  console.log("Creaitng upgrade panel: " + upgradeData.name)
  const root = document.createElement("div");
  root.className = "upgradeButton";

  const text = document.createElement("div");
  text.className = "upgradeText"
  const name = document.createElement("h3")
  name.innerText = upgradeData.name;
  const description = document.createElement("p")
  description.innerText = upgradeData.description;
  text.appendChild(name);
  text.appendChild(description);

  const cost = document.createElement("div");
  cost.className = "upgradeCost"
  const costAmount = document.createElement("h3");
  costAmount.innerText = format(upgradeData.GetCost()) + " " + upgradeData.cost_resource;
  costAmount.id = "costAmount"
  const owned = document.createElement("p");
  owned.innerText = getUpgradeAmount(upgradeData.id) + " Owned";
  owned.id = "ownedAmount";
  cost.appendChild(costAmount)
  cost.appendChild(owned)

  


  root.appendChild(text);
  root.appendChild(cost);

  cost.addEventListener("click", (e) => {
    console.log("Button Clicked:" + upgradeData.name);
    upgradeData.Buy();
    owned.innerText = getUpgradeAmount(upgradeData.id) + " Owned";
    costAmount.innerText = format(upgradeData.GetCost()) + " " + upgradeData.cost_resource;
    
  })

  return root;
}

function generateManaBars() {
  manaBarsEl.innerHTML = "";

  const container = document.createElement("div")
  container.className = "box"

  const text = document.createElement("h3")
  text.innerText = "Tier " + toRoman(0+1) + " Core"
  container.appendChild(text)

  const content = document.createElement("div")

  const bar = document.createElement("div");
  bar.className = "mana-bar";

  const fill = document.createElement("div");
  fill.className = "mana-bar-fill";
  fill.dataset.index = 0;
  bar.appendChild(fill);

  const stats = document.createElement("p");
  stats.innerText = computeManaCoreAmountMultiplier(0) + " mana";
    
  content.appendChild(stats);
  content.appendChild(bar)

  container.appendChild(content)

  upgradeUpdateManager.add(() => {
    console.log("Update received")
    stats.innerText = computeManaCoreAmountMultiplier(0) + " mana";
  })
    
    
  manaBarsEl.appendChild(container);

}

function loadSidebar(){
  document.querySelectorAll(".sidebarButton").forEach((t) => {
    t.addEventListener("click",(e) => {
      document.querySelectorAll(".panel").forEach((y) => y.classList.remove("active"))
      document.querySelectorAll(".panel").forEach((y) => y.classList.hidden("hidden"))
      const id = "#upgrade-panel-" + t.innerText;
      console.log(id);
      document.querySelector(id).classList.add("active")
    })
  });
}

function generateUpgradeUI() {
  const tabsEl = document.getElementById("upgrade-tabs");
  const panelsEl = document.getElementById("upgrade-panels");

  tabsEl.innerHTML = "";
  panelsEl.innerHTML = "";
  
  const upgradeTiers = GameData.upgrades;

  upgradeTiers.forEach((tier, index) => {
    // Create tab
    const tab = document.createElement("button");
    tab.className = "tab" + (index === 0 ? " selected" : "");
    tab.textContent = toRoman(tier.id);
    tab.dataset.tab = tier.id;
    if(index != 0)
      tab.requirements = `{ \"id\" : \"t${tier.id}_core_create\", \"amount\" : 1}`
    tabsEl.appendChild(tab);

    // Create panel
    const panel = document.createElement("div");
    panel.className = "box .upgrade-panel " + (index === 0 ? "active" : "hidden");
    panel.dataset.panel = tier.id;
    panel.id = "upgrade-panel-" + tier.id;

    const title = document.createElement("h3");
    title.textContent = tier.name;
    title.style.margin = "0 0 5px 0";
    panel.appendChild(title);

    const upgradePanel = document.createElement("div");
    upgradePanel.className = "box";
    const upgradeTitle = document.createElement("h3");
    upgradeTitle.textContent = "Upgrades:";
    upgradeTitle.style.margin = "0 0 5px 0";
   
    upgradePanel.appendChild(upgradeTitle);

    tier.upgrades.forEach(upg => {
      const btn = createUpgradePanel(upg);
      upgradePanel.appendChild(btn);
    });
    panel.appendChild(upgradePanel)

    const researchPanel = document.createElement("div");
    researchPanel.className = "box";
    const researchTitle = document.createElement("h3");
    researchTitle.textContent = "Research:";
    researchTitle.style.margin = "0 0 5px 0";
    researchPanel.appendChild(researchTitle);

    tier.research.forEach(upg => {
      const btn = createUpgradePanel(upg);
      researchPanel.appendChild(btn);
    });
    panel.appendChild(researchPanel)

    panelsEl.appendChild(panel);
  });

  // add tab switching logic
  tabsEl.addEventListener("click", e => {
    if (!e.target.classList.contains("tab")) return;

    const id = e.target.dataset.tab;

    if(e.target.requirements){
      
      if(!(new RequirementData(e.target.requirements).Check())){
        console.log("Failed to meet: " + e.target.requirements);
        return;
      }
    }

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("selected"));
    document.querySelectorAll(".upgrade-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".upgrade-panel").forEach(p => p.classList.add("hidden"));

    e.target.classList.add("selected");
    document.querySelector("#upgrade-panel-" + id).classList.remove("hidden");
    document.querySelector("#upgrade-panel-" + id).classList.add("active");
  });
}

function gameLoop(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    updateUI();
    handleTimeDelta(delta);

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

function computeManaCoreTimeMultiplier(i){
  const circulateID = `t${i+1}_circulate`
  return 0.2 / (i + 1) * (getUpgradeAmount(circulateID)+1)
}

function computeManaCoreAmountMultiplier(i){
  const condenseID = `t${i+1}_condense`
  return 10 ** i * (getUpgradeAmount(condenseID) + 1);
}

function updateUI(){
  manaEl.textContent = format(Math.floor(GameState.mana));

  updateManaBars();
}

function updateManaBars() {
  document.querySelectorAll(".mana-bar-fill").forEach(fill => {
    const i = fill.dataset.index;
    const value = GameState.manaProgress; // 0..1
    fill.style.width = `${Math.min(value, 1) * 100}%`;
  });
}

function handleTimeDelta(delta){
  const idleSimulationTimestep = 1;
  for(let j = 0; j < delta; j += 1){
    const currentDelta = Math.min(delta - j,idleSimulationTimestep);


    GameState.manaProgress += currentDelta * computeManaCoreTimeMultiplier(0)

    if(GameState.manaProgress >= 1){
      const amount = Math.floor(GameState.manaProgress);
      GameState.mana += amount * computeManaCoreAmountMultiplier(0);
      GameState.manaProgress -= amount;
    }
  }
}

function toRoman(num) {
    const roman = [
        ["M", 1000],
        ["CM", 900],
        ["D", 500],
        ["CD", 400],
        ["C", 100],
        ["XC", 90],
        ["L", 50],
        ["XL", 40],
        ["X", 10],
        ["IX", 9],
        ["V", 5],
        ["IV", 4],
        ["I", 1]
    ];

    let result = "";
    let n = num;

    for (const [symbol, value] of roman) {
        while (n >= value) {
            result += symbol;
            n -= value;
        }
    }

    return result;
}
