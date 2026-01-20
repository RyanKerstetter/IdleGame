window.GameData = {
  upgrades: null,        // JSON-backed class instance
  loaded: false
};

window.GameState = {
  mana: 0,
  research: 0,
  manaProgress: Array(9).fill(0),
  upgrades : {},
  lastTick: Date.now()
}

class RequirementData {
  constructor(obj){
    this.name = obj.name;
    this.amount  = obj.amount;
  }

  Check(){
    return GameState.upgrades[this.name] >= this.amount;
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
    const currentAmount = GameState.upgrades[this.name];
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

    if(this.cost_resource == "mana"){
      GameState.mana -= resourceCost;
    } else if(this.cost_resource == "research"){
      GameState.research -= resourceCost;
    } else {
      console.log("Unidentifies resource cost buy" + this.cost_resource);
    }

    GameState.upgrades[this.name] = (GameState.upgrades[this.name] ?? 0) + 1;
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
  const root = document.createElement("div");
  root.className = "upgradeButton";

  const name = document.createElement("h1");
  name.innerText = upgradeData.name;

  const cost = document.createElement("h3");
  cost.innerText = upgradeData.cost;

  root.appendChild(name);
  root.appendChild(cost);

  root.addEventListener("click", (e) => {
    upgradeData.Buy();
  })

  return root;
}



function generateManaBars() {
  manaBarsEl.innerHTML = "";

  GameState.manaProgress.forEach((_, i) => {
    const bar = document.createElement("div");
    bar.className = "mana-bar";

    const fill = document.createElement("div");
    fill.className = "mana-bar-fill";
    fill.dataset.index = i;

    bar.appendChild(fill);
    manaBarsEl.appendChild(bar);
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
    tab.className = "tab" + (index === 0 ? " active" : "");
    tab.textContent = toRoman(tier.id);
    tab.dataset.tab = tier.id;
    if(index != 0)
      tab.requirements = `{ \"id\" : \"t${tier.id}_core_research\", \"amount\" : 1}`
    tabsEl.appendChild(tab);

    // Create panel
    const panel = document.createElement("div");
    panel.className = "box upgrade-panel" + (index === 0 ? " active" : "");
    panel.dataset.panel = tier.id;

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
      console.log(e.target.requirements)
      if(!(new RequirementData(e.target.requirements).Check()))
        return;
    }

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".upgrade-panel").forEach(p => p.classList.remove("active"));

    e.target.classList.add("active");
    document.querySelector(`.upgrade-panel[data-panel="${id}"]`).classList.add("active");
  });
}

function gameLoop(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    updateText();
    handleTimeDelta(delta);

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

function updateText(){
  manaEl.textContent = format(Math.floor(GameState.mana));

  updateManaBars();
}

function updateManaBars() {
  document.querySelectorAll(".mana-bar-fill").forEach(fill => {
    const i = fill.dataset.index;
    const value = GameState.manaProgress[i]; // 0..1
    fill.style.width = `${Math.min(value, 1) * 100}%`;
  });
}

function handleTimeDelta(delta){
  const idleSimulationTimestep = 1;
  for(let j = 0; j < delta; j += 1){
    const currentDelta = Math.min(delta - j,idleSimulationTimestep);
    for(let i = 0; i < GameState.manaProgress.length;i++){
      const coreUnlockID = `t${i+1}_core_research`;
      if(i != 0 && GameState.upgrades[coreUnlockID] != 1){
        continue;
      }


      GameState.manaProgress[i] += currentDelta * 0.2 / (i + 1);

      if(GameState.manaProgress[i] >= 1){
        const amount = Math.floor(GameState.manaProgress[i]);
        GameState.mana += 10 ** i * amount;
        GameState.manaProgress[i] -= amount;
      }
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
