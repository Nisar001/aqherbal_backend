import crypto from 'crypto';
import logger from '../utils/logger.js';
import { config } from '../config/config.js';
import { spamKeywords, defaultSpamThresholds } from '../utils/spamRules.js';

const URL_REGEX = /https?:\/\/[^\s)"'>]+/gi;

class SpamDetectionService {
  constructor(options = {}) {
    this.thresholds = {
      ...defaultSpamThresholds,
      maxLinks: Number(config.spam.maxLinks),
      maxKeywordHits: Number(config.spam.maxKeywordHits),
      maxPayloadBytes: Number(config.spam.maxPayloadBytes),
      maxRepeatCharRun: Number(config.spam.maxRepeatCharRun),
      ...options
    };
  }

  evaluate(payload, context = {}) {
    const stringified = this.safeStringify(payload);
    const payloadBytes = Buffer.byteLength(stringified, 'utf8');

    const linkCount = this.countLinks(stringified);
    const keywordHits = this.countKeywords(stringified);
    const repeatRuns = this.countRepeatRuns(stringified);

    const reasons = [];
    let score = 0;

    if (payloadBytes > this.thresholds.maxPayloadBytes) {
      reasons.push(`payload_too_large:${payloadBytes}`);
      score += 3;
    }

    if (linkCount > this.thresholds.maxLinks) {
      reasons.push(`excessive_links:${linkCount}`);
      score += 2;
    }

    if (keywordHits >= this.thresholds.maxKeywordHits) {
      reasons.push(`spam_keywords:${keywordHits}`);
      score += 2;
    }

    if (repeatRuns > 0) {
      reasons.push('repeated_characters');
      score += 1;
    }

    const isSpam = score >= 3;

    if (isSpam) {
      logger.warn('Spam detected', {
        route: context.route,
        ip: context.ip,
        userId: context.userId,
        reasons,
        score,
        hash: this.hashPayload(stringified)
      });
    }

    return { isSpam, reasons, score, payloadBytes, linkCount, keywordHits };
  }

  countLinks(str) {
    const matches = str.match(URL_REGEX);
    return matches ? matches.length : 0;
  }

  countKeywords(str) {
    const lower = str.toLowerCase();
    return spamKeywords.reduce((acc, keyword) => (lower.includes(keyword) ? acc + 1 : acc), 0);
  }

  countRepeatRuns(str) {
    const repeatThreshold = Math.max(3, this.thresholds.maxRepeatCharRun || 10);
    const repeatRegex = new RegExp(`(.)\\1{${repeatThreshold - 1},}`, 'g');
    const matches = str.match(repeatRegex);
    return matches ? matches.length : 0;
  }

  safeStringify(obj) {
    try {
      return JSON.stringify(obj) || '';
    } catch {
      return '';
    }
  }

  hashPayload(str) {
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
  }
}

export const spamDetectionService = new SpamDetectionService();
