import type { Status } from '../engine/forecast'

export const STATUS_COLOR: Record<Status, string> = { ok: '#10b981', warn: '#f59e0b', risk: '#ef4444' }

export const LINE_COLORS = { centre: '#1d6fe0', far: STATUS_COLOR.warn }
