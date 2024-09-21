import child_process from "child_process";
import kill from "tree-kill";

let etapiAuthToken: string | undefined;

const getEtapiAuthorizationHeader = (): string =>
  "Basic " + Buffer.from(`etapi:${etapiAuthToken}`).toString("base64");

const PORT: string = "9999";
const HOST: string = "http://localhost:" + PORT;

type SpecDefinitionsFunc = () => void;

function describeEtapi(
  description: string,
  specDefinitions: SpecDefinitionsFunc
): void {
  describe(description, () => {
    let appProcess: ReturnType<typeof child_process.spawn>;

    beforeAll(async () => {
      
    });

    afterAll(() => {
      
    });

    specDefinitions();
  });
}

async function getEtapiResponse(url: string): Promise<Response> {
  return await fetch(`${HOST}/etapi/${url}`, {
    method: "GET",
    headers: {
      Authorization: getEtapiAuthorizationHeader(),
    },
  });
}

async function getEtapi(url: string): Promise<any> {
  const response = await getEtapiResponse(url);
  return await processEtapiResponse(response);
}

async function getEtapiContent(url: string): Promise<Response> {
  const response = await fetch(`${HOST}/etapi/${url}`, {
    method: "GET",
    headers: {
      Authorization: getEtapiAuthorizationHeader(),
    },
  });

  checkStatus(response);

  return response;
}

async function postEtapi(
  url: string,
  data: Record<string, unknown> = {}
): Promise<any> {
  const response = await fetch(`${HOST}/etapi/${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getEtapiAuthorizationHeader(),
    },
    body: JSON.stringify(data),
  });
  return await processEtapiResponse(response);
}

async function postEtapiContent(
  url: string,
  data: BodyInit
): Promise<Response> {
  const response = await fetch(`${HOST}/etapi/${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: getEtapiAuthorizationHeader(),
    },
    body: data,
  });

  checkStatus(response);

  return response;
}

async function putEtapi(
  url: string,
  data: Record<string, unknown> = {}
): Promise<any> {
  const response = await fetch(`${HOST}/etapi/${url}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: getEtapiAuthorizationHeader(),
    },
    body: JSON.stringify(data),
  });
  return await processEtapiResponse(response);
}

async function putEtapiContent(
  url: string,
  data?: BodyInit
): Promise<Response> {
  const response = await fetch(`${HOST}/etapi/${url}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: getEtapiAuthorizationHeader(),
    },
    body: data,
  });

  checkStatus(response);

  return response;
}

async function patchEtapi(
  url: string,
  data: Record<string, unknown> = {}
): Promise<any> {
  const response = await fetch(`${HOST}/etapi/${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: getEtapiAuthorizationHeader(),
    },
    body: JSON.stringify(data),
  });
  return await processEtapiResponse(response);
}

async function deleteEtapi(url: string): Promise<any> {
  const response = await fetch(`${HOST}/etapi/${url}`, {
    method: "DELETE",
    headers: {
      Authorization: getEtapiAuthorizationHeader(),
    },
  });
  return await processEtapiResponse(response);
}

async function processEtapiResponse(response: Response): Promise<any> {
  const text = await response.text();

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`ETAPI error ${response.status}: ${text}`);
  }

  return text?.trim() ? JSON.parse(text) : null;
}

function checkStatus(response: Response): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`ETAPI error ${response.status}`);
  }
}

export default {
  describeEtapi,
  getEtapi,
  getEtapiResponse,
  getEtapiContent,
  postEtapi,
  postEtapiContent,
  putEtapi,
  putEtapiContent,
  patchEtapi,
  deleteEtapi,
};
