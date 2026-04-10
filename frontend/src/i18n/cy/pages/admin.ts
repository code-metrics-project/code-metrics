const admin = {
  admin: {
    title: "Gweinyddiaeth",
    description:
      "Gweithredwch y gosodiadau a'r tasgau gweinyddol ar gyfer eich enghraifft Code Metrics. Mae'r adran hon yn darparu offer ar gyfer gweithrediadau system, rheolaeth diogelwch, a chyfluniad gwasanaethau.",
    cards: {
      tokens: {
        title: "Tocynnau Gwasanaeth",
        description: "Cyhoeddi, dirymu a rheoli tocynnau gwasanaeth ar gyfer mynediad API.",
        action: "Rheoli tocynnau gwasanaeth",
      },
      datastores: {
        title: "Storfeydd Data",
        description: "Gweld a rheoli casgliadau a thablau storio ffisegol.",
        action: "Rheoli storfeydd data",
      },
    },
    tokens: {
      title: "Tocynnau Gwasanaeth",
      description:
        "Rheoli tocynnau gwasanaeth API ar gyfer systemau awtomataidd a phrosesau cefndir. Mae tocynnau gwasanaeth yn darparu mynediad diogel a hirhoedlog i'r API CodeMetrics.",
      createButton: "Creu tocyn",
      table: {
        title: "Tocynnau gwasanaeth gweithredol",
        subject: "Pwnc",
        created: "Crëwyd",
        expires: "Yn dod i ben",
        createdBy: "Crëwyd gan",
        actions: "Gweithredoedd",
      },
      empty: {
        title: "Heb ganfod tocynnau gwasanaeth",
        description: "Crëwch eich tocyn gwasanaeth cyntaf i gychwyn mynediad API.",
      },
      createDialog: {
        title: "Creu tocyn gwasanaeth",
        subjectLabel: "Enw pwnc/gwasanaeth",
        subjectPlaceholder: "Rhowch enw ystyrlon",
        subjectHelp: "Enw disgrifiadol ar gyfer y gwasanaeth neu'r cymhwysiad sy'n defnyddio'r tocyn hwn",
        successTitle: "Crëwyd tocyn",
        importantLabel: "Pwysig:",
        importantDescription: "Copïwch y tocyn hwn nawr. Ni fydd ar gael eto er mwyn diogelwch.",
        doneButton: "Wedi gorffen",
        cancelButton: "Canslo",
        submitButton: "Creu tocyn",
      },
      revokeDialog: {
        title: "Dirymu tocyn gwasanaeth?",
        confirmMessage: "Ydych chi'n siŵr eich bod am ddirymu'r tocyn gwasanaeth hwn?",
        subjectLabel: "Pwnc",
        createdLabel: "Crëwyd",
        warning:
          "Ni ellir dadwneud y weithred hon. Bydd systemau sy'n defnyddio'r tocyn hwn yn colli mynediad ar unwaith.",
        cancelButton: "Canslo",
        submitButton: "Dirymu tocyn",
      },
      toast: {
        loadError: "Methu llwytho tocynnau gwasanaeth",
        createSuccess: "Crëwyd tocyn gwasanaeth yn llwyddiannus",
        createError: "Methu creu tocyn gwasanaeth",
        revokeSuccess: "Dirymwyd y tocyn gwasanaeth yn llwyddiannus",
        revokeError: "Methu dirymu'r tocyn gwasanaeth",
        copySuccess: "Tocyn wedi'i gopïo i'r clipfwrdd",
      },
    },
    datastores: {
      title: "Storfeydd Data",
      description:
        "Gweld a rheoli'r casgliadau a'r tablau storio ffisegol sy'n sail i'r storfa ddata. Dyma endidau crai'r peiriant storio (casgliadau MongoDB, tablau DynamoDB, ffeiliau NeDB, neu fwcedi mewn cof).",
      table: {
        title: "Casgliadau",
        name: "Enw",
        actions: "Gweithredoedd",
      },
      empty: {
        title: "Heb ganfod casgliadau",
        description: "Ni chanfuwyd unrhyw gasgliadau na thablau storio ffisegol yn y peiriant storio gweithredol.",
      },
      toast: {
        loadError: "Methu llwytho casgliadau'r storfa ddata",
      },
      detail: {
        title: "Manylion y casgliad",
        nameLabel: "Enw'r casgliad",
        existsLabel: "Yn bodoli",
        existsYes: "Ydy",
        existsNo: "Nac ydy",
        countButton: "Cyfrif eitemau",
        countLabel: "Nifer yr eitemau",
        countNotChecked: "Heb wirio",
        emptyButton: "Gwagio'r casgliad",
        emptyDialog: {
          title: "Gwagio'r casgliad?",
          description: "Ydych chi'n siŵr eich bod am wagio'r casgliad hwn? Bydd hyn yn dileu pob eitem yn barhaol.",
          warning: "Ni ellir dadwneud y weithred hon. Bydd yr holl ddata yn y casgliad hwn yn cael ei golli.",
          cancelButton: "Canslo",
          submitButton: "Gwagio'r casgliad",
        },
        toast: {
          existsError: "Methu gwirio bodolaeth y casgliad",
          countError: "Methu cyfrif eitemau",
          emptySuccess: "Gwagiwyd y casgliad yn llwyddiannus",
          emptyError: "Methu gwagio'r casgliad",
        },
      },
    },
  },
};

export default admin;
