#!/usr/bin/env node

import anonymizationService from '../src/services/anonymization.js';
import fs from 'fs';
import path from 'path';

fs.writeFileSync(path.resolve(__dirname, 'tpl', 'anonymize-database.sql'), anonymizationService.getFullAnonymizationScript());
