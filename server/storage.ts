import { users, type User, type InsertUser } from "@shared/schema";
import { SharedRecording } from "./routes";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Shared recording methods
  getSharedRecording(id: string): Promise<SharedRecording | undefined>;
  saveSharedRecording(recording: SharedRecording): Promise<SharedRecording>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sharedRecordings: Map<string, SharedRecording>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.sharedRecordings = new Map();
    this.currentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Shared recording methods
  async getSharedRecording(id: string): Promise<SharedRecording | undefined> {
    return this.sharedRecordings.get(id);
  }
  
  async saveSharedRecording(recording: SharedRecording): Promise<SharedRecording> {
    this.sharedRecordings.set(recording.id, recording);
    return recording;
  }
}

export const storage = new MemStorage();
