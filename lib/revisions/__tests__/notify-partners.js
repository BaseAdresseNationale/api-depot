const test = require("ava");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const mockClients = {
  "641493ac8259bc0027670f04": {
    _id: "641493ac8259bc0027670f04",
    nom: "Mes Adresses",
    id: "mes-adresses",
    chefDeFile: "641492230abe143383ddd3dg",
    mandataire: "641492230abe143383ddd3de",
  },
  "641492230abe143383ddd3df": {
    _id: "641492230abe143383ddd3df",
    nom: "Formulaire de publication",
    id: "formulaire-publication",
    chefDeFile: "641492230abe143383ddd3dg",
    mandataire: "641492230abe143383ddd3de",
  },
  "63f5eb7db804021c67e4e4dc": {
    _id: "63f5eb7db804021c67e4e4dc",
    nom: "RGD Savoie",
    chefDeFile: "63f5eb7db804021c67e4e4dd",
    mandataire: "63f5eb7db804021c67e4e4de",
  },
};

function mockFetchClient(clientId) {
  return mockClients[clientId];
}

const mockChefsDeFile = {
  "641492230abe143383ddd3dg": {
    _id: "641492230abe143383ddd3dg",
    email: "adresse@data.gouv.fr",
  },
  "63f5eb7db804021c67e4e4dd": {
    _id: "63f5eb7db804021c67e4e4dd",
    email: "contact@rdgd-savoie.fr",
  },
};

function mockFetchChefDeFile(chefDeFileId) {
  return mockChefsDeFile[chefDeFileId];
}

const mockMandataires = {
  "641492230abe143383ddd3de": {
    _id: "641492230abe143383ddd3de",
    email: "adresse@data.gouv.fr",
  },
  "63f5eb7db804021c67e4e4de": {
    _id: "63f5eb7db804021c67e4e4de",
    email: "contact@rdgd-savoie.fr",
  },
};

function mockFetchMandataire(mandataireId) {
  return mockMandataires[mandataireId];
}

const initNotifyPartners = (spy) =>
  proxyquire("../notify-partners", {
    "../clients/model": {
      fetch: mockFetchClient,
    },
    "../chefs-de-file/model": {
      fetch: mockFetchChefDeFile,
    },
    "../mandataires/model": {
      fetch: mockFetchMandataire,
    },
    "../util/sendmail": {
      sendMail: spy,
    },
  });

test("should send email on force publish via mes-adresses", async (t) => {
  const sendMailSpy = sinon.spy();
  const notifyPartners = initNotifyPartners(sendMailSpy);
  const prevRevision = {
    client: "63f5eb7db804021c67e4e4dc",
    codeCommune: "31591",
  };
  const currentRevision = {
    client: "641493ac8259bc0027670f04",
    codeCommune: "31591",
  };
  await notifyPartners.notifyPartnersOnForcePublish({
    prevRevision,
    currentRevision,
  });
  t.true(sendMailSpy.calledOnce);
});

test("should send email on force publish via formulaire", async (t) => {
  const sendMailSpy = sinon.spy();
  const notifyPartners = initNotifyPartners(sendMailSpy);
  const prevRevision = {
    client: "63f5eb7db804021c67e4e4dc",
    codeCommune: "31591",
  };
  const currentRevision = {
    client: "641492230abe143383ddd3df",
    codeCommune: "31591",
  };
  await notifyPartners.notifyPartnersOnForcePublish({
    prevRevision,
    currentRevision,
  });
  t.true(sendMailSpy.calledOnce);
});

test("should not send email when no prev revision", async (t) => {
  const sendMailSpy = sinon.spy();
  const notifyPartners = initNotifyPartners(sendMailSpy);
  const currentRevision = {
    client: "641492230abe143383ddd3df",
    codeCommune: "31591",
  };
  await notifyPartners.notifyPartnersOnForcePublish({
    prevRevision: null,
    currentRevision,
  });
  t.false(sendMailSpy.calledOnce);
});

test("should not send email when prev revision was published by a managed client", async (t) => {
  const sendMailSpy = sinon.spy();
  const notifyPartners = initNotifyPartners(sendMailSpy);
  const prevRevision = {
    client: "641492230abe143383ddd3df",
    codeCommune: "31591",
  };
  const currentRevision = {
    client: "641492230abe143383ddd3df",
    codeCommune: "31591",
  };
  await notifyPartners.notifyPartnersOnForcePublish({
    prevRevision,
    currentRevision,
  });
  t.false(sendMailSpy.calledOnce);
});
