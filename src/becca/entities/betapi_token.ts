"use strict";

import { EtapiTokenRow } from "./rows";

const dateUtils = require('../../services/date_utils');
const AbstractBeccaEntity = require('./abstract_becca_entity.js');

/**
 * EtapiToken is an entity representing token used to authenticate against Trilium REST API from client applications.
 * Used by:
 * - Trilium Sender
 * - ETAPI clients
 *
 * The format user is presented with is "<etapiTokenId>_<tokenHash>". This is also called "authToken" to distinguish it
 * from tokenHash and token.
 *
 * @extends AbstractBeccaEntity
 */
class BEtapiToken extends AbstractBeccaEntity {
    static get entityName() { return "etapi_tokens"; }
    static get primaryKeyName() { return "etapiTokenId"; }
    static get hashedProperties() { return ["etapiTokenId", "name", "tokenHash", "utcDateCreated", "utcDateModified", "isDeleted"]; }

    etapiTokenId!: string;
    name!: string;
    tokenHash!: string;
    utcDateCreated!: string;
    utcDateModified!: string;
    isDeleted!: boolean;

    constructor(row: EtapiTokenRow) {
        super();

        if (!row) {
            return;
        }

        this.updateFromRow(row);
        this.init();
    }

    updateFromRow(row: EtapiTokenRow) {
        this.etapiTokenId = row.etapiTokenId;
        this.name = row.name;
        this.tokenHash = row.tokenHash;
        this.utcDateCreated = row.utcDateCreated || dateUtils.utcNowDateTime();
        this.utcDateModified = row.utcDateModified || this.utcDateCreated;
        this.isDeleted = !!row.isDeleted;

        if (this.etapiTokenId) {
            this.becca.etapiTokens[this.etapiTokenId] = this;
        }
    }

    init() {
        if (this.etapiTokenId) {
            this.becca.etapiTokens[this.etapiTokenId] = this;
        }
    }

    getPojo() {
        return {
            etapiTokenId: this.etapiTokenId,
            name: this.name,
            tokenHash: this.tokenHash,
            utcDateCreated: this.utcDateCreated,
            utcDateModified: this.utcDateModified,
            isDeleted: this.isDeleted
        }
    }

    beforeSaving() {
        this.utcDateModified = dateUtils.utcNowDateTime();

        super.beforeSaving();

        this.becca.etapiTokens[this.etapiTokenId] = this;
    }
}

export = BEtapiToken;