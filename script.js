const CURRENCIES = {
  INR: { symbol: "₹", rate: 1 },
  USD: { symbol: "$", rate: 0.010 },
  EUR: { symbol: "€", rate: 0.0089 },
  GBP: { symbol: "£", rate: 0.0077 }
};
let activePage = "dashboard";
let selectedType1 = "expense";
let selectedType2 = "expense";
let pendingVoiceTx = null;

let donutChart = null;
let barChart = null;
let lineChart = null;
let growthChart = null;

let data = {
  transactions: JSON.parse(localStorage.getItem("ft_tx")) || [],
  splits: JSON.parse(localStorage.getItem("ft_splits")) || [],
  budget: Number(localStorage.getItem("ft_budget")) || 0,
  currency: localStorage.getItem("ft_currency") || "INR",
  theme: localStorage.getItem("ft_theme") || "dark",
  profile: JSON.parse(localStorage.getItem("ft_profile")) || {
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: ""
  }
};

function saveData() {
  localStorage.setItem("ft_tx", JSON.stringify(data.transactions));
  localStorage.setItem("ft_splits", JSON.stringify(data.splits));
  localStorage.setItem("ft_budget", data.budget);
  localStorage.setItem("ft_currency", data.currency);
  localStorage.setItem("ft_theme", data.theme);
  localStorage.setItem("ft_profile", JSON.stringify(data.profile));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(amount) {
  let c = CURRENCIES[data.currency];

  let formatted =
    (amount * c.rate).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  return c.symbol + formatted;
}
function totals() {
  let income = 0;
  let expense = 0;
  for (let i = 0; i < data.transactions.length; i++) {
    let tx = data.transactions[i];
    if (tx.type == "income") {
      income = income + tx.amount;
    } else {
      expense = expense + tx.amount;
    }
  }
  return {
    income: income,
    expense: expense,
    balance: income - expense
  };
}
function setBalance(id, amount) {
  document.getElementById(id).textContent = money(amount);
  if (amount >= 0) {
    document.getElementById(id).style.color = "#22c55e";
  } else {
    document.getElementById(id).style.color = "#ef4444";
  }
}

function applyTheme() {
  if (data.theme == "light") {
    document.body.classList.add("light");
    document.getElementById("themeToggleBtn").checked = true;
  } else {
    document.body.classList.remove("light");
    document.getElementById("themeToggleBtn").checked = false;
  }
}

function goToPage(page) {
  activePage = page;
  let pages = document.querySelectorAll(".page");
  for (let i = 0; i < pages.length; i++) {
    pages[i].hidden = true;
    pages[i].classList.remove("active");
  }
  document.getElementById("page-" + page).hidden = false;
  document.getElementById("page-" + page).classList.add("active");
  let navBtns = document.querySelectorAll(".nav-btn");
  for (let i = 0; i < navBtns.length; i++) {
    if (navBtns[i].dataset.page == page) {
      navBtns[i].classList.add("active");
    } else {
      navBtns[i].classList.remove("active");
    }
  }
  renderAll();
}

function setType(formNumber, type) {
  let s = "";
  if (formNumber == 2) {
    s = "2";
    selectedType2 = type;
  } else {
    selectedType1 = type;
  }
  if (type == "income") {
    document.getElementById("btnIncome" + s).classList.add("active");
    document.getElementById("btnExpense" + s).classList.remove("active");
  } else {
    document.getElementById("btnExpense" + s).classList.add("active");
    document.getElementById("btnIncome" + s).classList.remove("active");
  }
}

function addTransaction(formNumber) {
  let s = "";
  if (formNumber == 2) {
    s = "2";
  }
  let desc = document.getElementById("desc" + s).value.trim();
  let amount = Number(document.getElementById("amount" + s).value);
  let category = document.getElementById("category" + s).value;
  let date = document.getElementById("txDate" + s).value;
  if (date == "") {
    date = today();
  }
  let type;
  if (formNumber == 2) {
    type = selectedType2;
  } else {
    type = selectedType1;
  }
  if (desc == "") {
    document.getElementById("descErr" + s).textContent = "Description required";
  } else {
    document.getElementById("descErr" + s).textContent = "";
  }
  if (amount <= 0) {
    document.getElementById("amountErr" + s).textContent = "Enter valid amount";
  } else {
    document.getElementById("amountErr" + s).textContent = "";
  }
  if (desc == "" || amount <= 0) {
    return;
  }
  let tx = {
    id: Date.now(),
    desc: desc,
    amount: amount,
    category: category,
    date: date,
    type: type,
    note: ""
  };
  data.transactions.push(tx);
  saveData();
  document.getElementById("txForm" + s).reset();
  document.getElementById("txDate" + s).value = today();
  setType(formNumber, "expense");
  renderAll();
}
function deleteTransaction(id) {
  let newList = [];
  for (let i = 0; i < data.transactions.length; i++) {
    if (data.transactions[i].id != id) {
      newList.push(data.transactions[i]);
    }
  }
  data.transactions = newList;
  saveData();
  renderAll();
}

function makeTable(list) {
  if (list.length == 0) {
    return '<div class="empty">No transactions found.</div>';
  }
  let rows = "";
  for (let i = 0; i < list.length; i++) {
    let tx = list[i];
    rows = rows +
      `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.desc}</td>
        <td><span class="category-tag">${tx.category}</span></td>
        <td class="amount ${tx.type}">
          ${tx.type == "income" ? "+" : "−"}${money(tx.amount)}
        </td>
        <td>
          <button class="btn-delete" onclick="deleteTransaction(${tx.id})">✕</button>
        </td>
      </tr>
    `;
  }
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderDashboard() {
  let t = totals();
  let rate = 0;
  if (t.income > 0) {
    rate = ((t.balance / t.income) * 100).toFixed(1);
  }
  document.getElementById("dashIncome").textContent = money(t.income);
  document.getElementById("dashExpense").textContent = money(t.expense);
  document.getElementById("dashSavingsRate").textContent = rate + "%";
  setBalance("dashBalance", t.balance);
  let hour = new Date().getHours();
  if (hour < 12) {
    document.getElementById("greetText").textContent = "Good morning";
  } else if (hour < 17) {
    document.getElementById("greetText").textContent = "Good afternoon";
  } else {
    document.getElementById("greetText").textContent = "Good evening";
  }
  document.getElementById("dashDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  renderBudget();
  renderRecentTransactions();
  renderInsights();
  renderTips();
}
function renderBudget() {
  let t = totals();
  if (data.budget > 0) {
    document.getElementById("budgetInput").value = data.budget;
  }
  let percent = 0;
  if (data.budget > 0) {
    percent = (t.expense / data.budget) * 100;
  }
  if (percent > 100) {
    percent = 100;
  }
  document.getElementById("budgetBar").style.width = percent + "%";
  if (percent >= 100) {
    document.getElementById("budgetBar").style.background = "#ef4444";
  } else if (percent >= 80) {
    document.getElementById("budgetBar").style.background = "#f59e0b";
  } else {
    document.getElementById("budgetBar").style.background = "#22c55e";
  }
  if (data.budget > 0) {
    document.getElementById("budgetStatus").textContent =
      money(t.expense) + " of " + money(data.budget);
    document.getElementById("profileBudgetStatus").textContent =
      "Current budget: " + money(data.budget);
  } else {
    document.getElementById("budgetStatus").textContent = "No budget set";
    document.getElementById("profileBudgetStatus").textContent = "No budget set";
  }
  if (data.budget > 0 && t.expense > data.budget) {
    document.getElementById("alert").textContent = "Budget exceeded!";
    document.getElementById("alert").classList.remove("hidden");
  } else {
    document.getElementById("alert").classList.add("hidden");
  }
}
function setBudgetFromInput(id) {
  let value = Number(document.getElementById(id).value);
  if (value <= 0) {
    alert("Enter valid budget");
    return;
  }
  data.budget = value;
  saveData();
  renderAll();
}
function renderRecentTransactions() {
  let list = [];
  for (let i = 0; i < data.transactions.length; i++) {
    list.push(data.transactions[i]);
  }
  list.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });
  let recent = [];
  for (let i = 0; i < list.length && i < 5; i++) {
    recent.push(list[i]);
  }
  document.getElementById("historyTable").innerHTML = makeTable(recent);
}

function renderInsights() {
  let expenses = [];
  for (let i = 0; i < data.transactions.length; i++) {
    if (data.transactions[i].type == "expense") {
      expenses.push(data.transactions[i]);
    }
  }
  let categoryNames = [];
  let categoryAmounts = [];
  for (let i = 0; i < expenses.length; i++) {
    let tx = expenses[i];
    let found = false;
    for (let j = 0; j < categoryNames.length; j++) {
      if (categoryNames[j] == tx.category) {
        categoryAmounts[j] = categoryAmounts[j] + tx.amount;
        found = true;
      }
    }
    if (found == false) {
      categoryNames.push(tx.category);
      categoryAmounts.push(tx.amount);
    }
  }
  let topCategory = "—";
  let maxAmount = 0;
  for (let i = 0; i < categoryNames.length; i++) {
    if (categoryAmounts[i] > maxAmount) {
      maxAmount = categoryAmounts[i];
      topCategory = categoryNames[i];
    }
  }
  document.getElementById("insightTopCat").textContent = topCategory;
  let month = new Date().toISOString().slice(0, 7);
  let monthCount = 0;
  for (let i = 0; i < data.transactions.length; i++) {
    if (data.transactions[i].date.slice(0, 7) == month) {
      monthCount++;
    }
  }
  document.getElementById("insightMonthTx").textContent = monthCount + " transactions";
  let biggest = null;
  for (let i = 0; i < expenses.length; i++) {
    if (biggest == null || expenses[i].amount > biggest.amount) {
      biggest = expenses[i];
    }
  }
  if (biggest == null) {
    document.getElementById("insightBigExp").textContent = "—";
  } else {
    document.getElementById("insightBigExp").textContent =
      money(biggest.amount) + " · " + biggest.desc;
  }
  let totalSpend = 0;
  for (let i = 0; i < expenses.length; i++) {
    totalSpend = totalSpend + expenses[i].amount;
  }
  if (totalSpend == 0) {
    document.getElementById("insightAvgSpend").textContent = "—";
  } else {
    document.getElementById("insightAvgSpend").textContent =
      money(totalSpend / 30) + "/day";
  }
}
function renderTips() {
  let box = document.getElementById("smartTips");
  let t = totals();
  let html = "";
  if (data.transactions.length == 0) {
    html =
      html +
      '<div class="tip tip-info"><span class="tip-emoji">👋</span><p class="tip-desc"><strong>Welcome!</strong> Add your first transaction.</p></div>';
  }
  if (data.budget == 0) {
    html =
      html +
      '<div class="tip tip-info"><span class="tip-emoji">🎯</span><p class="tip-desc"><strong>Set a monthly budget</strong> to track spending.</p></div>';
  } else if (t.expense > data.budget) {
    html =
      html +
      '<div class="tip tip-warn"><span class="tip-emoji">🚨</span><p class="tip-desc"><strong>Budget exceeded!</strong> Reduce expenses.</p></div>';
  } else {
    html =
      html +
      '<div class="tip tip-good"><span class="tip-emoji">✅</span><p class="tip-desc"><strong>Budget is under control.</strong></p></div>';
  }
  box.innerHTML = html;
}

function renderTransactionsPage() {
  let t = totals();
  document.getElementById("msIncome").textContent = money(t.income);
  document.getElementById("msExpense").textContent = money(t.expense);
  setBalance("msBalance", t.balance);
  setBalance("txPageBalance", t.balance);
  renderFullHistory();
}
function renderFullHistory() {
  let search = document.getElementById("searchBox2").value.toLowerCase();
  let type = document.getElementById("filterType2").value;
  let category = document.getElementById("filterCat2").value;
  let list = [];
  for (let i = 0; i < data.transactions.length; i++) {
    let tx = data.transactions[i];
    let searchMatch =
      tx.desc.toLowerCase().includes(search) ||
      tx.category.toLowerCase().includes(search);
    let typeMatch = type == "all" || tx.type == type;
    let categoryMatch = category == "all" || tx.category == category;
    if (searchMatch && typeMatch && categoryMatch) {
      list.push(tx);
    }
  }
  list.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });
  document.getElementById("historyTable2").innerHTML = makeTable(list);
}

function renderAnalytics() {
  let t = totals();
  setBalance("heroBalance", t.balance);
  if (t.balance >= 0) {
    document.getElementById("heroSub").textContent = "You are in profit";
  } else {
    document.getElementById("heroSub").textContent = "You are in deficit";
  }
  let categoryNames = [];
  let categoryAmounts = [];
  for (let i = 0; i < data.transactions.length; i++) {
    let tx = data.transactions[i];
    if (tx.type == "expense") {
      let found = false;
      for (let j = 0; j < categoryNames.length; j++) {
        if (categoryNames[j] == tx.category) {
          categoryAmounts[j] = categoryAmounts[j] + tx.amount;
          found = true;
        }
      }
      if (found == false) {
        categoryNames.push(tx.category);
        categoryAmounts.push(tx.amount);
      }
    }
  }
  if (donutChart != null) {
    donutChart.destroy();
  }
  donutChart = new Chart(document.getElementById("donutChart2"), {
    type: "doughnut",
    data: {
      labels: categoryNames,
      datasets: [
        {
          data: categoryAmounts
        }
      ]
    }
  });
  let months = [];
  let incomeData = [];
  let expenseData = [];
  for (let i = 0; i < data.transactions.length; i++) {
    let tx = data.transactions[i];
    let month = tx.date.slice(0, 7);
    let index = -1;
    for (let j = 0; j < months.length; j++) {
      if (months[j] == month) {
        index = j;
      }
    }
    if (index == -1) {
      months.push(month);
      incomeData.push(0);
      expenseData.push(0);
      index = months.length - 1;
    }
    if (tx.type == "income") {
      incomeData[index] = incomeData[index] + tx.amount;
    } else {
      expenseData[index] = expenseData[index] + tx.amount;
    }
  }
  if (barChart != null) {
    barChart.destroy();
  }
  barChart = new Chart(document.getElementById("barChart2"), {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Income",
          data: incomeData
        },
        {
          label: "Expense",
          data: expenseData
        }
      ]
    }
  });
  let balanceLabels = [];
  let balanceValues = [];
  let runningBalance = 0;
  for (let i = 0; i < data.transactions.length; i++) {
    let tx = data.transactions[i];
    if (tx.type == "income") {
      runningBalance = runningBalance + tx.amount;
    } else {
      runningBalance = runningBalance - tx.amount;
    }
    balanceLabels.push(tx.date);
    balanceValues.push(runningBalance);
  }
  if (lineChart != null) {
    lineChart.destroy();
  }
  lineChart = new Chart(document.getElementById("lineChart2"), {
    type: "line",
    data: {
      labels: balanceLabels,
      datasets: [
        {
          label: "Balance",
          data: balanceValues
        }
      ]
    }
  });
  renderCategorySummary(categoryNames, categoryAmounts);
}
function renderCategorySummary(categoryNames, categoryAmounts) {
  let box = document.getElementById("catSummary2");
  let total = 0;
  for (let i = 0; i < categoryAmounts.length; i++) {
    total = total + categoryAmounts[i];
  }
  if (total == 0) {
    box.innerHTML = '<div class="empty">No expense data yet.</div>';
    return;
  }
  let rows = "";
  for (let i = 0; i < categoryNames.length; i++) {
    let percent = ((categoryAmounts[i] / total) * 100).toFixed(1);
    rows =rows +`
      <tr>
        <td>${categoryNames[i]}</td>
        <td>${money(categoryAmounts[i])}</td>
        <td>${percent}%</td>
        <td>
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width:${percent}%"></div>
          </div>
        </td>
      </tr>`;
  }
  box.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Amount</th>
          <th>Share</th>
          <th>Bar</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function createSplit() {
  let name = document.getElementById("groupName2").value.trim();
  let membersText = document.getElementById("groupMembers2").value;
  let amount = Number(document.getElementById("groupAmount2").value);
  if (name == "" || membersText == "" || amount <= 0) {
    alert("Fill all fields");
    return;
  }
  let members = membersText.split(",");
  let cleanMembers = [];
  for (let i = 0; i < members.length; i++) {
    let m = members[i].trim();
    if (m != "") {
      cleanMembers.push(m);
    }
  }
  if (cleanMembers.length == 0) {
    alert("Enter members");
    return;
  }
  let split = {
    id: Date.now(),
    name: name,
    members: cleanMembers,
    amount: amount,
    perPerson: amount / cleanMembers.length
  };
  data.splits.push(split);
  saveData();
  document.getElementById("groupName2").value = "";
  document.getElementById("groupMembers2").value = "";
  document.getElementById("groupAmount2").value = "";
  renderSplits();
}
function renderSplits() {
  let box = document.getElementById("splitResults2");
  if (data.splits.length == 0) {
    box.innerHTML = '<div class="empty">No split groups yet.</div>';
    return;
  }
  let html = "";
  for (let i = 0; i < data.splits.length; i++) {
    let g = data.splits[i];
    html =html +`<div class="split-card"><div class="split-top"><span class="split-name">${g.name}</span><span class="split-total">Total: ${money(g.amount)}</span></div>
        <p class="split-per">Each person pays: ${money(g.perPerson)}</p>`;
    for (let j = 0; j < g.members.length; j++) {
      html =html +`<div class="split-member"> <span>${g.members[j]}</span><span>${money(g.perPerson)}</span></div>`;
    }
    html =html +`<button class="btn-delete" onclick="deleteSplit(${g.id})">Delete</button></div>`;
  }
  box.innerHTML = html;
}
function deleteSplit(id) {
  let newList = [];
  for (let i = 0; i < data.splits.length; i++) {
    if (data.splits[i].id != id) {
      newList.push(data.splits[i]);
    }
  }
  data.splits = newList;
  saveData();
  renderSplits();
}

function calcGrowth() {
  let p = Number(document.getElementById("tPrincipal").value);
  let r = Number(document.getElementById("tRate").value);
  let years = Number(document.getElementById("tYears").value);
  if (p <= 0 || r < 0 || years <= 0) {
    alert("Enter valid values");
    return;
  }
  let labels = [];
  let values = [];
  for (let y = 0; y <= years; y++) {
    labels.push("Year " + y);
    values.push(p * Math.pow(1 + r / 100, y));
  }
  document.getElementById("tGrowthResult").textContent =
    "After " + years + " years: " + money(values[values.length - 1]);
  document.getElementById("tGrowthChart").classList.remove("hidden");
  if (growthChart != null) {
    growthChart.destroy();
  }
  growthChart = new Chart(document.getElementById("tGrowthChart"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Growth",
          data: values
        }
      ]
    }
  });
}
function calcEMI() {
  let loan = Number(document.getElementById("emiLoan").value);
  let rate = Number(document.getElementById("emiRate").value);
  let months = Number(document.getElementById("emiMonths").value);
  if (loan <= 0 || rate < 0 || months <= 0) {
    alert("Enter valid EMI values");
    return;
  }
  let monthlyRate = rate / 12 / 100;
  let emi;
  if (monthlyRate == 0) {
    emi = loan / months;
  } else {
    emi =
      (loan * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }
  document.getElementById("emiResult").innerHTML ='<div class="tip tip-info"><strong>Monthly EMI:</strong> ' +money(emi) +"<br><strong>Total Payment:</strong> " +money(emi * months) +"</div>";
}
function calcGoal() {
  let target = Number(document.getElementById("goalTarget").value);
  let saved = Number(document.getElementById("goalSaved").value);
  let months = Number(document.getElementById("goalMonths").value);
  if (target <= 0 || saved < 0 || months <= 0) {
    alert("Enter valid goal values");
    return;
  }
  let need = (target - saved) / months;
  if (need < 0) {
    need = 0;
  }
  document.getElementById("goalResult").innerHTML ='<div class="tip tip-good">Save <strong>' +money(need) +"</strong> per month.</div>";
}

function startVoice() {
  let Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    alert("Voice input is not supported in this browser.");
    return;
  }
  let voiceRec = new Speech();
  voiceRec.lang = "en-IN";
  voiceRec.continuous = false;
  voiceRec.interimResults = false;
  document.getElementById("micStatus").textContent = "Listening...";
  document.getElementById("micStatusTools").textContent = "Listening...";
  voiceRec.onresult = function (e) {
    let text = e.results[0][0].transcript;
    document.getElementById("micTranscript").textContent = text;
    document.getElementById("micTranscriptTools").textContent = text;
    pendingVoiceTx = readVoiceText(text);
    if (pendingVoiceTx != null) {
      let preview ="<p>" +pendingVoiceTx.type +" · " +pendingVoiceTx.category +" · " +money(pendingVoiceTx.amount) +" · " +pendingVoiceTx.desc +"</p>";
      document.getElementById("voicePreviewContent").innerHTML = preview;
      document.getElementById("voicePreviewContentTools").innerHTML = preview;
      document.getElementById("voiceBox").classList.remove("hidden");
      document.getElementById("voiceBoxTools").classList.remove("hidden");
    }
  };
  voiceRec.onend = function () {
    document.getElementById("micStatus").textContent = "";
    document.getElementById("micStatusTools").textContent = "";
  };
  voiceRec.start();
}
function readVoiceText(text) {
  let lower = text.toLowerCase();
  let match = lower.match(/\d+(\.\d+)?/);
  if (match == null) {
    return null;
  }
  let amount = Number(match[0]);
  let type = "expense";
  if (
    lower.includes("income") ||
    lower.includes("salary") ||
    lower.includes("earned") ||
    lower.includes("received")
  ) {
    type = "income";
  }
  let category = "Other";
  if (lower.includes("food")) category = "Food";
  else if (lower.includes("travel")) category = "Travel";
  else if (lower.includes("rent")) category = "Rent";
  else if (lower.includes("shopping")) category = "Shopping";
  else if (lower.includes("entertainment")) category = "Entertainment";
  else if (lower.includes("health")) category = "Health";
  else if (lower.includes("education")) category = "Education";
  else if (lower.includes("salary")) category = "Salary";
  return {
    id: Date.now(),
    desc: text,
    amount: amount,
    type: type,
    category: category,
    date: today(),
    note: "Added by voice"
  };
}
function confirmVoice() {
  if (pendingVoiceTx == null) {
    return;
  }
  data.transactions.push(pendingVoiceTx);
  pendingVoiceTx = null;
  saveData();
  document.getElementById("voiceBox").classList.add("hidden");
  document.getElementById("voiceBoxTools").classList.add("hidden");
  renderAll();
}
function discardVoice() {
  pendingVoiceTx = null;
  document.getElementById("voiceBox").classList.add("hidden");
  document.getElementById("voiceBoxTools").classList.add("hidden");
}

function renderProfile() {
  let t = totals();
  document.getElementById("profileNameDisplay").textContent = data.profile.name;
  document.getElementById("profileEmailDisplay").textContent = data.profile.email;
  if (data.profile.name.length > 0) {
    document.getElementById("profileAvatarDisplay").textContent =
      data.profile.name[0].toUpperCase();
  } else {
    document.getElementById("profileAvatarDisplay").textContent = "U";
  }
  document.getElementById("profileTxCount").textContent = data.transactions.length;
  document.getElementById("profileTotalIncome").textContent = money(t.income);
  document.getElementById("profileTotalExpense").textContent = money(t.expense);
  document.getElementById("profileNetBalance").textContent = money(t.balance);
  document.getElementById("profileName").value = data.profile.name;
  document.getElementById("profileEmail").value = data.profile.email;
  document.getElementById("profilePhone").value = data.profile.phone;
  document.getElementById("profileCurrency").value = data.currency;
  document.getElementById("profileBudget").value = data.budget;
  document.getElementById("profileStatList").innerHTML =
    '<div class="stats-row-item"><span class="stats-key">Transactions</span><span class="stats-val">' +
    data.transactions.length +
    '</span></div><div class="stats-row-item"><span class="stats-key">Income</span><span class="stats-val">' +
    money(t.income) +
    '</span></div><div class="stats-row-item"><span class="stats-key">Expense</span><span class="stats-val">' +
    money(t.expense) +
    '</span></div><div class="stats-row-item"><span class="stats-key">Balance</span><span class="stats-val">' +
    money(t.balance) +
    "</span></div>";
}
function saveProfile() {
  data.profile.name = document.getElementById("profileName").value.trim();
  data.profile.email = document.getElementById("profileEmail").value.trim();
  data.profile.phone = document.getElementById("profilePhone").value.trim();
  saveData();
  document.getElementById("profileSaveMsg").textContent =
    "Profile saved successfully.";
  renderProfile();
}
function clearTransactions() {
  let ans = confirm("Clear all transactions?");
  if (!ans) {
    return;
  }
  data.transactions = [];
  saveData();
  renderAll();
}

function exportCSV() {
  if (data.transactions.length == 0) {
    alert("No data");
    return;
  }
  let csv = "Date,Description,Category,Type,Amount\n";
  for (let i = 0; i < data.transactions.length; i++) {
    let tx = data.transactions[i];
    csv =csv + tx.date +"," +tx.desc +"," +tx.category +"," +tx.type +"," +tx.amount +"\n";
  }
  let blob = new Blob([csv], { type: "text/csv" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "fintrack.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function resetEverything() {
  let ans = confirm("Reset everything?");
  if (!ans) {
    return;
  }
  localStorage.clear();
  location.reload();
}

function updateCurrencySymbols() {
  let symbols = document.querySelectorAll(".currency-symbol");
  for (let i = 0; i < symbols.length; i++) {
    symbols[i].textContent = CURRENCIES[data.currency].symbol;
  }
}
function renderAll() {
  updateCurrencySymbols();
  document.getElementById("currencySelect").value = data.currency;
  document.getElementById("profileCurrency").value = data.currency;
  renderDashboard();
  renderTransactionsPage();
  renderSplits();
  if (activePage == "analytics") {
    renderAnalytics();
  }
  if (activePage == "profile") {
    renderProfile();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  applyTheme();
  document.getElementById("txDate").value = today();
  document.getElementById("txDate2").value = today();
  let navBtns = document.querySelectorAll(".nav-btn");
  for (let i = 0; i < navBtns.length; i++) {
    navBtns[i].addEventListener("click", function () {
      goToPage(navBtns[i].dataset.page);
    });
  }
  document.getElementById("hamburgerBtn").addEventListener("click", function () {
    document.getElementById("navbar").classList.toggle("open");
  });
  document.getElementById("avatarBtn").addEventListener("click", function () {
    goToPage("profile");
  });
  document.getElementById("viewAllTxBtn").addEventListener("click", function () {
    goToPage("transactions");
  });
  document.getElementById("txForm").addEventListener("submit", function (e) {
    e.preventDefault();
    addTransaction(1);
  });
  document.getElementById("txForm2").addEventListener("submit", function (e) {
    e.preventDefault();
    addTransaction(2);
  });
  document.getElementById("btnIncome").addEventListener("click", function () {
    setType(1, "income");
  });
  document.getElementById("btnExpense").addEventListener("click", function () {
    setType(1, "expense");
  });
  document.getElementById("btnIncome2").addEventListener("click", function () {
    setType(2, "income");
  });
  document.getElementById("btnExpense2").addEventListener("click", function () {
    setType(2, "expense");
  });
  document.getElementById("setBudgetBtn").addEventListener("click", function () {
    setBudgetFromInput("budgetInput");
  });
  document.getElementById("saveProfileBudgetBtn").addEventListener("click", function () {
    setBudgetFromInput("profileBudget");
  });
  document.getElementById("currencySelect").addEventListener("change", function () {
    data.currency = document.getElementById("currencySelect").value;
    saveData();
    renderAll();
  });
  document.getElementById("profileCurrency").addEventListener("change", function () {
    data.currency = document.getElementById("profileCurrency").value;
    saveData();
    renderAll();
  });
  document.getElementById("themeToggleBtn").addEventListener("change", function () {
    if (document.getElementById("themeToggleBtn").checked) {
      data.theme = "light";
    } else {
      data.theme = "dark";
    }
    saveData();
    applyTheme();
  });
  document.getElementById("searchBox2").addEventListener("input", renderFullHistory);
  document.getElementById("filterType2").addEventListener("change", renderFullHistory);
  document.getElementById("filterCat2").addEventListener("change", renderFullHistory);
  document.getElementById("exportBtn2").addEventListener("click", exportCSV);
  document.getElementById("exportBtnProfile").addEventListener("click", exportCSV);
  document.getElementById("clearAllBtnProfile").addEventListener("click", clearTransactions);
  document.getElementById("resetAllBtn").addEventListener("click", resetEverything);
  document.getElementById("createSplitBtn2").addEventListener("click", createSplit);
  let quickBtns = document.querySelectorAll(".quick-btn");
  for (let i = 0; i < quickBtns.length; i++) {
    quickBtns[i].addEventListener("click", function () {
      let target = quickBtns[i].dataset.target;
      let members = quickBtns[i].dataset.members;
      document.getElementById(target).value = members;
    });
  }
  document.getElementById("tCalcGrowthBtn").addEventListener("click", calcGrowth);
  document.getElementById("calcEmiBtn").addEventListener("click", calcEMI);
  document.getElementById("calcGoalBtn").addEventListener("click", calcGoal);
  document.getElementById("micBtn").addEventListener("click", startVoice);
  document.getElementById("micBtnTx").addEventListener("click", startVoice);
  document.getElementById("micBtnToolsPage").addEventListener("click", startVoice);
  document.getElementById("confirmVoiceBtn").addEventListener("click", confirmVoice);
  document.getElementById("confirmVoiceBtnTools").addEventListener("click", confirmVoice);
  document.getElementById("discardVoiceBtn").addEventListener("click", discardVoice);
  document.getElementById("discardVoiceBtnTools").addEventListener("click", discardVoice);
  document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
  renderAll();
});