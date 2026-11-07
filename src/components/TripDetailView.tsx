import React from 'react';
import { Trip, Category, Sheet, Settings, PlanItem, ResearchItem } from '../types';
import {
  fmt,
  budgetCountedTotal,
  tripDuration,
  countryFlagForTrip,
  daysUntil
} from '../utils/helpers';
import { BudgetTab } from './BudgetTab';
import { TripChartsTab } from './TripChartsTab';
import { PlanTab } from './PlanTab';
import { ResearchTab } from './ResearchTab';
import { VisitedTab } from './VisitedTab';
import { NotesTab } from './NotesTab';
import { PackingTab } from './PackingTab';
import { AttireTab } from './AttireTab';
import { HaulsTab } from './HaulsTab';
import { TripMap } from './TripMap';
import { MobileBottomTabs } from './MobileBottomTabs';
import { ensureActualExpense } from '../utils/storage';
