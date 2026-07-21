/**
 * In-memory database fallback para testes quando MySQL não está disponível
 * Simula persistência de dados para desenvolvimento rápido
 */

interface StoredUser {
  id: number;
  email: string;
  passwordHash: string | null;
  name: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

interface StoredCheckIn {
  id: number;
  userId: number;
  sleepQuality: number;
  energyLevel: number;
  mentalClarity: number;
  notes?: string;
  createdAt: Date;
}

interface StoredTask {
  id: number;
  userId: number;
  title: string;
  description?: string;
  totalEstimatedTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  priority?: 'urgente' | 'alta' | 'media' | 'baixa' | 'sem';
  status: 'pending' | 'in_progress' | 'completed';
  scheduledTime?: string | null;
  plannedDate?: string | null;
  recurrenceRule?: string | null;
  recurrenceEndDate?: string | null;
  seriesId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredMicroStep {
  id: number;
  taskId: number;
  title: string;
  description?: string;
  estimatedTime: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  completed: boolean;
  order: number;
  createdAt: Date;
}

interface StoredPractice {
  id: number;
  title: string;
  description: string;
  category: 'focus' | 'relief' | 'inspiration';
  duration: number;
  instructions?: string;
  createdAt: Date;
}

interface StoredDecompositionHistory {
  id: number;
  userId: number;
  originalTask: string;
  decomposedData: string;
  createdAt: Date;
}

interface StoredPushSubscription {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}

class InMemoryDatabase {
  private users: Map<number, StoredUser> = new Map();
  private checkIns: Map<number, StoredCheckIn> = new Map();
  private tasks: Map<number, StoredTask> = new Map();
  private microSteps: Map<number, StoredMicroStep> = new Map();
  private practices: Map<number, StoredPractice> = new Map();
  private decompositionHistory: Map<number, StoredDecompositionHistory> = new Map();
  private pushSubscriptions: Map<number, StoredPushSubscription> = new Map();
  private notificationSettings: Map<number, Record<string, unknown>> = new Map();
  private notificationLog: Set<string> = new Set();

  private userIdCounter = 1;
  private checkInIdCounter = 1;
  private taskIdCounter = 1;
  private microStepIdCounter = 1;
  private practiceIdCounter = 1;
  private decompositionIdCounter = 1;
  private pushSubscriptionIdCounter = 1;

  // Users
  createUser(user: Omit<StoredUser, 'id'>) {
    const id = this.userIdCounter++;
    const stored = { ...user, id };
    this.users.set(id, stored);
    return stored;
  }

  getUserByEmail(email: string) {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  getUserById(id: number) {
    return this.users.get(id);
  }

  updateLastSignedIn(id: number) {
    const user = this.users.get(id);
    if (user) {
      user.lastSignedIn = new Date();
    }
  }

  // Check-ins
  createCheckIn(userId: number, sleepQuality: number, energyLevel: number, mentalClarity: number, notes?: string) {
    const id = this.checkInIdCounter++;
    const checkIn: StoredCheckIn = {
      id,
      userId,
      sleepQuality,
      energyLevel,
      mentalClarity,
      notes,
      createdAt: new Date(),
    };
    this.checkIns.set(id, checkIn);
    return { insertId: id };
  }

  getTodayCheckIn(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todays = Array.from(this.checkIns.values())
      .filter(c => c.userId === userId && c.createdAt >= today)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return todays[0] ?? null;
  }

  getCheckInCount(userId: number) {
    return Array.from(this.checkIns.values()).filter(c => c.userId === userId).length;
  }

  getWeeklyCheckIns(userId: number) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return Array.from(this.checkIns.values())
      .filter(c => c.userId === userId && c.createdAt >= sevenDaysAgo)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Tasks
  createTask(userId: number, title: string, description?: string, totalEstimatedTime?: number, difficulty?: string, priority?: string) {
    const id = this.taskIdCounter++;
    const task: StoredTask = {
      id,
      userId,
      title,
      description,
      totalEstimatedTime,
      difficulty: difficulty as 'easy' | 'medium' | 'hard' | undefined,
      priority: (priority ?? 'sem') as 'urgente' | 'alta' | 'media' | 'baixa' | 'sem',
      status: 'pending',
      scheduledTime: null,
      plannedDate: null,
      recurrenceRule: null,
      recurrenceEndDate: null,
      seriesId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);
    return { insertId: id };
  }

  getUserTasks(userId: number) {
    return Array.from(this.tasks.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateTaskStatus(taskId: number, status: 'pending' | 'in_progress' | 'completed') {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
    }
  }

  updateTaskScheduledTime(taskId: number, scheduledTime: string | null) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.scheduledTime = scheduledTime;
      task.updatedAt = new Date();
    }
  }

  updateTaskPlannedDate(taskId: number, plannedDate: string | null) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.plannedDate = plannedDate;
      task.updatedAt = new Date();
    }
  }

  updateTaskPriority(taskId: number, priority: 'urgente' | 'alta' | 'media' | 'baixa' | 'sem') {
    const task = this.tasks.get(taskId);
    if (task) {
      task.priority = priority;
      task.updatedAt = new Date();
    }
  }

  updateTaskDetails(taskId: number, updates: { title?: string; totalEstimatedTime?: number; priority?: 'urgente' | 'alta' | 'media' | 'baixa' | 'sem' }) {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);
      task.updatedAt = new Date();
    }
  }

  getAnchorTasksForDate(date: string) {
    return Array.from(this.tasks.values())
      .filter(t => t.plannedDate === date && !!t.scheduledTime && t.status !== "completed");
  }

  updateTaskRecurrence(taskId: number, rule: string | null, endDate: string | null) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.recurrenceRule = rule;
      task.recurrenceEndDate = endDate;
      task.updatedAt = new Date();
    }
  }

  getActiveRecurrenceRoots() {
    return Array.from(this.tasks.values()).filter(t => !!t.recurrenceRule);
  }

  getOccurrenceDatesForSeries(seriesId: number): Set<string> {
    const dates = Array.from(this.tasks.values())
      .filter(t => t.seriesId === seriesId && t.plannedDate != null)
      .map(t => t.plannedDate as string);
    return new Set(dates);
  }

  createTaskOccurrence(
    root: { userId: number; title: string; priority: StoredTask["priority"] | null | undefined; totalEstimatedTime: number | null | undefined; scheduledTime: string | null | undefined },
    seriesId: number,
    plannedDate: string
  ) {
    const id = this.taskIdCounter++;
    const task: StoredTask = {
      id,
      userId: root.userId,
      title: root.title,
      priority: root.priority ?? "sem",
      totalEstimatedTime: root.totalEstimatedTime ?? undefined,
      status: "pending",
      scheduledTime: root.scheduledTime,
      plannedDate,
      recurrenceRule: null,
      recurrenceEndDate: null,
      seriesId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);
    return { insertId: id };
  }

  deleteTask(taskId: number) {
    // Delete micro-steps first
    const microStepsToDelete = Array.from(this.microSteps.values())
      .filter(ms => ms.taskId === taskId)
      .map(ms => ms.id);
    
    microStepsToDelete.forEach(id => this.microSteps.delete(id));
    
    // Then delete the task
    this.tasks.delete(taskId);
  }

  // Micro-steps
  createMicroSteps(taskId: number, steps: Array<{ title: string; description?: string; estimatedTime: number; difficulty: string; order: number }>) {
    const ids: number[] = [];
    steps.forEach(step => {
      const id = this.microStepIdCounter++;
      const microStep: StoredMicroStep = {
        id,
        taskId,
        title: step.title,
        description: step.description,
        estimatedTime: step.estimatedTime,
        difficulty: step.difficulty as 'easy' | 'medium' | 'hard',
        completed: false,
        order: step.order,
        createdAt: new Date(),
      };
      this.microSteps.set(id, microStep);
      ids.push(id);
    });
    return { insertId: ids[0] || 0 };
  }

  getTaskMicroSteps(taskId: number) {
    return Array.from(this.microSteps.values())
      .filter(m => m.taskId === taskId)
      .sort((a, b) => a.order - b.order);
  }

  updateMicroStepStatus(microStepId: number, completed: boolean) {
    const step = this.microSteps.get(microStepId);
    if (step) {
      step.completed = completed;
    }
  }

  addMicroStep(taskId: number, title: string, estimatedTime: number = 10) {
    const id = this.microStepIdCounter++;
    const existing = Array.from(this.microSteps.values()).filter(m => m.taskId === taskId);
    const nextOrder = existing.length > 0 ? Math.max(...existing.map(s => s.order)) + 1 : 1;
    const microStep: StoredMicroStep = {
      id,
      taskId,
      title,
      estimatedTime,
      completed: false,
      order: nextOrder,
      createdAt: new Date(),
    };
    this.microSteps.set(id, microStep);
    return { insertId: id };
  }

  updateMicroStepDetails(microStepId: number, updates: { title?: string; estimatedTime?: number }) {
    const step = this.microSteps.get(microStepId);
    if (step) {
      Object.assign(step, updates);
    }
  }

  deleteMicroStep(microStepId: number) {
    this.microSteps.delete(microStepId);
  }

  // Practices
  getAllPractices() {
    return Array.from(this.practices.values());
  }

  getPracticesByCategory(category: 'focus' | 'relief' | 'inspiration') {
    return Array.from(this.practices.values()).filter(p => p.category === category);
  }

  createPractice(title: string, description: string, category: 'focus' | 'relief' | 'inspiration', duration: number, instructions?: string) {
    const id = this.practiceIdCounter++;
    const practice: StoredPractice = {
      id,
      title,
      description,
      category,
      duration,
      instructions,
      createdAt: new Date(),
    };
    this.practices.set(id, practice);
    return { insertId: id };
  }

  // Decomposition history
  saveDecompositionHistory(userId: number, originalTask: string, decomposedData: any) {
    const id = this.decompositionIdCounter++;
    const history: StoredDecompositionHistory = {
      id,
      userId,
      originalTask,
      decomposedData: JSON.stringify(decomposedData),
      createdAt: new Date(),
    };
    this.decompositionHistory.set(id, history);
    return { insertId: id };
  }

  getUserDecompositionHistory(userId: number) {
    return Array.from(this.decompositionHistory.values())
      .filter(h => h.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(item => ({
        ...item,
        decomposedData: JSON.parse(item.decomposedData),
      }));
  }

  // Push subscriptions
  upsertPushSubscription(userId: number, endpoint: string, p256dh: string, auth: string) {
    const existing = Array.from(this.pushSubscriptions.values()).find(s => s.endpoint === endpoint);
    if (existing) {
      existing.userId = userId;
      existing.p256dh = p256dh;
      existing.auth = auth;
      return existing;
    }
    const id = this.pushSubscriptionIdCounter++;
    const sub: StoredPushSubscription = { id, userId, endpoint, p256dh, auth, createdAt: new Date() };
    this.pushSubscriptions.set(id, sub);
    return sub;
  }

  deletePushSubscription(endpoint: string) {
    const existing = Array.from(this.pushSubscriptions.entries()).find(([, s]) => s.endpoint === endpoint);
    if (existing) this.pushSubscriptions.delete(existing[0]);
  }

  getPushSubscriptionsForUser(userId: number) {
    return Array.from(this.pushSubscriptions.values()).filter(s => s.userId === userId);
  }

  getAllUserIdsWithPushSubscriptions() {
    return Array.from(new Set(Array.from(this.pushSubscriptions.values()).map(s => s.userId)));
  }

  // Notification settings
  getNotificationSettings(userId: number) {
    return this.notificationSettings.get(userId) ?? null;
  }

  saveNotificationSettings(userId: number, settings: Record<string, unknown>) {
    this.notificationSettings.set(userId, settings);
  }

  getAllNotificationSettings() {
    return Array.from(this.notificationSettings.entries()).map(([userId, settings]) => ({ userId, settings }));
  }

  // Notification dedupe log
  wasNotificationSent(userId: number, kind: string, refId: number, sentDate: string) {
    return this.notificationLog.has(`${userId}:${kind}:${refId}:${sentDate}`);
  }

  markNotificationSent(userId: number, kind: string, refId: number, sentDate: string) {
    this.notificationLog.add(`${userId}:${kind}:${refId}:${sentDate}`);
  }

  // Utilities
  clear() {
    this.users.clear();
    this.checkIns.clear();
    this.tasks.clear();
    this.microSteps.clear();
    this.practices.clear();
    this.decompositionHistory.clear();
    this.pushSubscriptions.clear();
    this.notificationSettings.clear();
    this.notificationLog.clear();
  }

  getStats() {
    return {
      users: this.users.size,
      checkIns: this.checkIns.size,
      tasks: this.tasks.size,
      microSteps: this.microSteps.size,
      practices: this.practices.size,
      decompositionHistory: this.decompositionHistory.size,
      pushSubscriptions: this.pushSubscriptions.size,
      notificationSettings: this.notificationSettings.size,
    };
  }
}

export const memoryDb = new InMemoryDatabase();
