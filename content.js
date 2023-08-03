const bodyElement = document.querySelector("body");

var dirHandle = null;

async function getDirectoryHandle() {
    if (dirHandle == null) {
        dirHandle = await window.showDirectoryPicker({
            id: "screenshots-source-directory",
            mode: "readwrite"
        });
    }
    return dirHandle;
}

function getFileName() {
    // `playwright/screenshots/${testDirectory}/{testFilePath}{/testName}/{arg}-{projectName}{ext}`,
    const testCaseTitle = document.querySelector(".test-case-title").textContent;
    const specLocation = RegExp(/(?<SpecLocation>.+):\d+/).exec(document.querySelector(".test-case-location").textContent).groups["SpecLocation"];
    const projectName = document.querySelector(".test-case-project-labels-row a span.label").textContent;
    const ext = "png";
    const fileName = `playwright/screenshots/${specLocation}/${testCaseTitle}/${testCaseTitle}-1-${projectName}.${ext}`;
    console.log(fileName);
    return fileName;
}

async function getFileHandle(directoryHandle, filePath) {
    let directoryNames = filePath.split("/");
    const fileName = directoryNames.pop();
    let currentDirectoryHandle = directoryHandle;
    for (const directoryName of directoryNames) {
        if (currentDirectoryHandle.name === directoryName) {
            continue;
        }
        try {
            const foundDirectory = await currentDirectoryHandle.getDirectoryHandle(directoryName);
            currentDirectoryHandle = foundDirectory;
        } catch (exception) {
            if (exception.name === "NotFoundError") {
                continue;
            } else {
                throw exception;
            }
        }
    }
    console.log(`${currentDirectoryHandle.name} - ${fileName}`);
    const fileHandle = await currentDirectoryHandle.getFileHandle(fileName);
    return fileHandle;
}

async function onAcceptImageButtonClick(event) {
    if (!(event instanceof MouseEvent)) {
        throw "This is not some click event!";
    }
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) {
        throw "This is not the button element!";
    }
    const testResultImageMismatchElement = button.parentElement;
    const linkElements = testResultImageMismatchElement.querySelectorAll("a");
    const matchingLinkElements = Array.prototype.filter.call(linkElements, function(element) {
        return RegExp("actual\.png$").test(element.textContent);
    });
    const matchingLinkElement = matchingLinkElements[0];

    const imageHref = matchingLinkElement.getAttribute("href");
    // const imgBlob = await getImageBlob(imageHref);
    const imgResponse = await fetch(imageHref);
    const imgBlob = await imgResponse.blob();

    const directoryHandle = await getDirectoryHandle();
    if (!(directoryHandle instanceof FileSystemDirectoryHandle)) {
        throw "Something went wrong with picking the directory.";
    }

    // const fileHandle = await directoryHandle.getFileHandle(getFileName(), { create: true });
    const fileHandle = await getFileHandle(directoryHandle, getFileName());
    if (!(fileHandle instanceof FileSystemHandle)) {
        throw "Something went wrong getting file handle.";
    }
    const writableFileStream = await fileHandle.createWritable();
    if (!(writableFileStream instanceof FileSystemWritableFileStream)) {
        throw "Something went wrong getting writable file stream.";
    }
    await writableFileStream.write({
        data: imgBlob,
        type: "write"
    });
    await writableFileStream.close();
}

function insertAcceptImageButton(imageMismatchElement) {
    if (!(imageMismatchElement instanceof HTMLElement)) {
        throw "This is not some HTMLElement!";
    }
    const acceptButton = document.createElement('button');
    acceptButton.textContent = "Accept actual image";
    acceptButton.addEventListener("click", onAcceptImageButtonClick);
    imageMismatchElement.insertAdjacentElement('afterbegin', acceptButton);
}

const observer = new MutationObserver((mutations, observer) => {
    for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
            if (!(addedNode instanceof HTMLElement)) {
                continue;
            }
            const testId = addedNode.getAttribute("data-testid");
            if (testId == "test-result-image-mismatch") {
                insertAcceptImageButton(addedNode);
                continue;
            }
            const imageMismatchElement = addedNode.querySelector("[data-testid='test-result-image-mismatch']");
            if (imageMismatchElement) {
                insertAcceptImageButton(imageMismatchElement);
                continue;
            }
        }
    }
});

observer.observe(bodyElement, {
    subtree: true,
    childList: true
});