// warehouse.js is where all data handling related work happens
// such as creating the Accordion, storing the data to storage, etc


let pattern = /^(http|https|file):\/\//;
// The pattern helps catch only http/https/file links excluding any about/ftp/ws/wss links

const colorscheme = {
  selectedArea: "#9e9e9e",
  textInSelecedArea: "#000000",
}

const newTabUrls = ["about:newtab", "about:blank", "chrome://newtab/"]

class storageObject {
  constructor(id, title, tabs, tags) {
    this.id = id;
    this.title = title;
    this.tabs = tabs;
    this.pinned = false;
    this.tags = tags;
  }
}

function countHighlighted(tabs) {
  let count = 0;
  for (let tab of tabs) {
    if (tab.highlighted == true) {
      count++;
    }
  }
  return count;
}

function isHighlighted(tab, _, __) {
  return tab.highlighted;
}

function createList(storeObj) {
  // createList() is used to create the Accordion which will be added to the
  // pop-up. It updates the currentTabs variable to store the newly created
  // Accordion.

  // id will be the unique identifier of each element in the stored Array
  let currentTabs = document.createDocumentFragment();
  let idArray = new Array();
  for (let id in storeObj) {
    idArray.unshift(id);
  }

  idArray.forEach(id => {
    if (storeObj.hasOwnProperty(id)) {
      // Create the accordion button and set the values of the button
      let obj = storeObj[id];

      let accDiv = document.createElement("div");
      let actionsDiv = document.createElement("div");
      let openButton = document.createElement("button");
      let saveTitle = document.createElement("span");
      let expandImg = document.createElement("img");
      let accExpand = document.createElement("button");
      let editImg = document.createElement("img");
      let accEdit = document.createElement("button");
      let delImg = document.createElement("img");
      let accDelete = document.createElement("button");

      saveTitle.textContent = obj.title;
      saveTitle.setAttribute("contentEditable", "false");
      saveTitle.setAttribute("class", "titleText");

      openButton.setAttribute("class", "btn btn-link openBtn");
      openButton.appendChild(saveTitle);

      openButton.addEventListener("click", () => {
        if (saveTitle.contentEditable === 'false') {
          validateAndOpenSave(obj)
        }

      });

      saveTitle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleTitleUpdate(obj, saveTitle)
        }
        if (event.key === ' ') {
          event.preventDefault();
          insertTextAtCaret(' ');
        }
      })

      saveTitle.addEventListener('focusout', () => {
        handleTitleUpdate(obj, saveTitle)
      });

      accEdit.addEventListener("click", () => {
        if (saveTitle.contentEditable === 'false') {
          saveTitle.contentEditable = 'true';
          saveTitle.style.backgroundColor = colorscheme.selectedArea;
          saveTitle.style.color = colorscheme.textInSelecedArea;
          saveTitle.focus();
        } else {
          handleTitleUpdate(obj, saveTitle)
        }
      });

      expandImg.setAttribute("src", "./../icons/drop_down.png");
      expandImg.setAttribute("class", "icon");

      accExpand.setAttribute("class", "btn btn-link iconBtn accExpand");
      accExpand.appendChild(expandImg);

      editImg.setAttribute("src", "./../icons/edit.png");
      editImg.setAttribute("class", "icon");

      accEdit.setAttribute("class", "btn btn-link iconBtn accEdit");
      accEdit.appendChild(editImg);

      delImg.setAttribute("src", "./../icons/delete.svg");
      delImg.setAttribute("class", "icon");

      accDelete.setAttribute("class", "btn btn-link iconBtn accDelete");
      accDelete.appendChild(delImg);

      actionsDiv.setAttribute("class", "actionsDiv")

      accDiv.setAttribute("class", "accDiv");
      accDiv.setAttribute("id", obj.id);

      let panelDiv = document.createElement("div");
      panelDiv.setAttribute("class", "panel");

      accDiv.appendChild(openButton);

      actionsDiv.appendChild(accEdit);
      actionsDiv.appendChild(accExpand);
      actionsDiv.appendChild(accDelete);

      accDiv.appendChild(actionsDiv);

      // The for loop is run to go through each tab present in the current window
      for (let tab of obj.tabs) {
        // Create the li tag into which the link is inserted
        let listItem = document.createElement("li");

        // Create a link for each tab which is saved and set its respective parameters
        let tabLink = document.createElement("button");
        let cutoffLength = 30;

        if (tab.textContent.length >= cutoffLength)
          tabLink.textContent =
            tab.textContent.slice(0, cutoffLength) + "...";
        else tabLink.textContent = tab.textContent;
        tabLink.setAttribute("class", "btn btn-link tabLinkBtn");
        listItem.addEventListener("click", () => {
          chrome.tabs.create({
            url: tab.url
          })
        })

        listItem.appendChild(tabLink);
        panelDiv.appendChild(listItem);
      }
      currentTabs.appendChild(accDiv);
      currentTabs.appendChild(panelDiv);
    }
  });
  return currentTabs;
}

function handleTitleUpdate(obj, titleSpan) {
  titleSpan.contentEditable = 'false';
  titleSpan.style.backgroundColor = '';
  titleSpan.style.color = '';
  validateAndUpdateTitle(obj, titleSpan.textContent);
}

function validateAndUpdateTitle(obj, newTitleText) {
  var santizedText = santizeTitleName(newTitleText)
  if (obj.title != santizedText && santizedText.length != 0) {
    persist(obj.id, santizedText, obj.tabs, obj.tags);
  }
}

function santizeTitleName(titleText) {
  const maxTitleLength = 40
  if (titleText.length >= maxTitleLength) {
    return titleText.substring(0, maxTitleLength);
  }
  return titleText.trim()
}

export function getCurrentWindowTabs() {
  return browser.tabs.query({ currentWindow: true });
}

function openSave(urlArray, isIncognito, currentTabs) {
  if (currentTabs.length == 1 && newTabUrls.includes(currentTabs[0].url)) {
    const tabIdOfNewTab = currentTabs[0].id
    for (let url of urlArray) {
      browser.tabs.create({
        url: url
      })
      browser.tabs.remove(tabIdOfNewTab)
        .catch((e) => {
          console.warn("Error when deleting newTab: ", e)
        })
    }
  }
  else {
    browser.windows.create({
      incognito: isIncognito,
      url: urlArray,
    })
  }
}

function validateAndOpenSave(obj) {
  let urlArray = new Array();
  for (let tab of obj.tabs) {
    urlArray.push(tab.url.toString());
  }
  let isIncognito = false
  browser.windows.getLastFocused()
    .then((windowInfo) => {
      isIncognito = windowInfo.incognito
    })
    .finally(() => {
      getCurrentWindowTabs()
        .then(tabs => { openSave(urlArray, isIncognito, tabs) })
        .catch((e) => {
          console.warn("Error when opening Save = ", e)
          openSave(urlArray, false, [])
        })
    });
}

// Reference: https://stackoverflow.com/a/75505941/4688365
function insertTextAtCaret(text) {
  var sel, range;
  sel = window.getSelection();
  if (sel && sel.getRangeAt && sel.rangeCount) {
    range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse();
  }
}

async function storeIt(tabs) {
  // storeIt takes only the required data from what is provided by the browser and
  // stores it into the storage.local

  // dataToStore is the object which contains data of the window which is going to be saved

  let time = new Date();
  var id = time.getTime();
  let tabArray = new Array();

  if (countHighlighted(tabs) > 1) {
    tabs = tabs.filter(isHighlighted);
  }

  for (let tab of tabs) {
    if (tab.url.match(pattern) != null) {
      let newTab = {};
      newTab.textContent = tab.title || tab.url;
      newTab.url = tab.url;
      newTab.iconUrl = tab.favIconUrl || null;
      tabArray.push(newTab);
    }
  }
  let title =
    time.getDate() +
    "/" +
    (time.getMonth() + 1) +
    " " +
    time.getHours() +
    ":" +
    time.getMinutes() +
    " | " +
    tabArray.length +
    " tabs";
  let tags = null;

  persist(id, title, tabArray, tags);

}

function persist(id, title, tabArray, tags) {
  var dataToStore = new storageObject(id, title, tabArray, tags);
  var obj = {};
  obj[id] = dataToStore;

  chrome.storage.local
    .set(obj)
    .then(() => { })
    .catch(error => {
      console.warn("Storage error occured: " + error);
    });
}

function retrieveIt() {
  // This function retrieves data from the storage.local and returns a Promise
  return chrome.storage.local.get(null);
}

export async function saveHandler(tabs) {
  // Handles all the function calls related to saving a session

  let returnPromise = new Promise((resolve, reject) => {
    storeIt(tabs)
      .then(() => {
        retrieveIt().then(obj => {
          let returnTab = createList(obj);
          resolve(returnTab);
        });
      })
      .catch(error => {
        console.log("Error occured while saving: " + error);
        reject(error);
      });
  });
  return await returnPromise;
}

export async function updateHandler() {
  // updateHandler syncs the data in storage.local with data displayed
  // in the popup

  // counter()
  let returnPromise = new Promise((resolve, reject) => {
    retrieveIt()
      .then(obj => {
        if (obj != undefined) {
          let returnTab = createList(obj);
          resolve(returnTab);
        } else {
          resolve(undefined);
        }
      })
      .catch(error => {
        console.warn("Error occured while updating: " + error);
        reject(error);
      });
  });
  return await returnPromise;
}

export async function deleteHandler(key) {
  let returnPromise = new Promise((resolve, reject) => {
    let returnValue = chrome.storage.local.remove(key);
    if (returnValue === undefined) {
      reject("Error occured while deleting");
    } else {
      resolve("Deleted successfully");
    }
  });
  return await returnPromise;
}