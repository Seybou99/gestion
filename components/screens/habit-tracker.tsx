import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

interface Habit {
  id: string;
  name: string;
  completedDays: boolean[];
  streak: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Theme colors
const getTheme = (colorScheme: "light" | "dark" | null) => {
  const isDark = colorScheme === "dark";

  return {
    background: isDark ? "#000000" : "#f8fafc",
    surface: isDark ? "#1c1c1e" : "#ffffff",
    surfaceSecondary: isDark ? "#2c2c2e" : "#f1f5f9",
    textPrimary: isDark ? "#ffffff" : "#1a1a1a",
    textSecondary: isDark ? "#a1a1aa" : "#64748b",
    textTertiary: isDark ? "#71717a" : "#94a3b8",
    primary: isDark ? "#007AFF" : "#0066CC",
    success: isDark ? "#30d158" : "#22c55e",
    warning: isDark ? "#ff9f0a" : "#f59e0b",
    danger: isDark ? "#ff453a" : "#ef4444",
    buttonBackground: isDark ? "#3a3a3c" : "#e2e8f0",
    buttonBackgroundActive: isDark ? "#30d158" : "#22c55e",
    border: isDark ? "#38383a" : "#e2e8f0",
    borderActive: isDark ? "#30d158" : "#16a34a",
    shadowColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.1)",
    glowColor: isDark ? "rgba(48, 209, 88, 0.4)" : "rgba(34, 197, 94, 0.3)",
    primaryGlow: isDark ? "rgba(0, 122, 255, 0.4)" : "rgba(0, 102, 204, 0.3)",
  };
};

export default function HabitTrackerScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme || "dark");
  const [habits, setHabits] = useState<Habit[]>([
    {
      id: "1",
      name: "Drink 8 glasses of water",
      completedDays: [true, true, false, true, false, true, false],
      streak: 2,
    },
    {
      id: "2",
      name: "Exercise for 30 minutes",
      completedDays: [false, true, true, true, false, false, true],
      streak: 1,
    },
    {
      id: "3",
      name: "Read for 20 minutes",
      completedDays: [true, false, true, false, true, true, true],
      streak: 3,
    },
    {
      id: "4",
      name: "Meditate",
      completedDays: [true, true, true, false, true, false, false],
      streak: 0,
    },
    {
      id: "5",
      name: "No social media before bed",
      completedDays: [false, true, false, true, true, true, false],
      streak: 0,
    },
  ]);

  const toggleHabitDay = (habitId: string, dayIndex: number) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === habitId) {
          const newCompletedDays = [...habit.completedDays];
          newCompletedDays[dayIndex] = !newCompletedDays[dayIndex];

          // Calculate new streak
          let streak = 0;
          for (let i = newCompletedDays.length - 1; i >= 0; i--) {
            if (newCompletedDays[i]) {
              streak++;
            } else {
              break;
            }
          }

          return {
            ...habit,
            completedDays: newCompletedDays,
            streak,
          };
        }
        return habit;
      })
    );
  };

  const getCompletionPercentage = (habit: Habit) => {
    const completed = habit.completedDays.filter(Boolean).length;
    return Math.round((completed / habit.completedDays.length) * 100);
  };

  const getTotalStreak = () => {
    return habits.reduce((total, habit) => total + habit.streak, 0);
  };

  const getWeeklyCompletion = () => {
    const totalPossible = habits.length * 7;
    const totalCompleted = habits.reduce(
      (total, habit) => total + habit.completedDays.filter(Boolean).length,
      0
    );
    return Math.round((totalCompleted / totalPossible) * 100);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              boxShadow: `0px 4px 20px ${theme.shadowColor}`,
            },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: theme.warning + "20" },
            ]}
          >
            <Text style={styles.statIcon}>🔥</Text>
          </View>
          <Text style={[styles.statNumber, { color: theme.warning }]}>
            {getTotalStreak()}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Streak
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              boxShadow: `0px 4px 20px ${theme.shadowColor}`,
            },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: theme.success + "20" },
            ]}
          >
            <Text style={styles.statIcon}>📊</Text>
          </View>
          <Text style={[styles.statNumber, { color: theme.success }]}>
            {getWeeklyCompletion()}%
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Week Progress
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              boxShadow: `0px 4px 20px ${theme.shadowColor}`,
            },
          ]}
        >
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: theme.primary + "20" },
            ]}
          >
            <Text style={styles.statIcon}>✅</Text>
          </View>
          <Text style={[styles.statNumber, { color: theme.primary }]}>
            {habits.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Active Habits
          </Text>
        </View>
      </View>

      {/* Days Header */}
      <View style={styles.daysHeader}>
        <View style={styles.habitNamePlaceholder} />
        {DAYS.map((day) => (
          <View key={day} style={styles.dayHeaderItem}>
            <Text style={[styles.dayLabel, { color: theme.textSecondary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Habits List */}
      {habits.map((habit, habitIndex) => (
        <View
          key={habit.id}
          style={[
            styles.habitCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              boxShadow: `0px 2px 12px ${theme.shadowColor}`,
            },
          ]}
        >
          <View style={styles.habitInfo}>
            <View style={styles.habitHeader}>
              <View
                style={[
                  styles.habitNumberContainer,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <Text style={[styles.habitNumber, { color: theme.primary }]}>
                  {habitIndex + 1}
                </Text>
              </View>
              <View style={styles.habitTitleContainer}>
                <Text style={[styles.habitName, { color: theme.textPrimary }]}>
                  {habit.name}
                </Text>
                <View style={styles.habitMeta}>
                  <Text style={[styles.streakText, { color: theme.warning }]}>
                    🔥 {habit.streak} day streak
                  </Text>
                  <View
                    style={[
                      styles.percentageBadge,
                      { backgroundColor: theme.success + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.percentageText, { color: theme.success }]}
                    >
                      {getCompletionPercentage(habit)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.daysContainer}>
            {habit.completedDays.map((completed, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: theme.buttonBackground,
                    borderColor: theme.border,
                  },
                  completed && {
                    backgroundColor: theme.buttonBackgroundActive,
                    borderColor: theme.borderActive,
                    boxShadow: `0px 2px 8px ${theme.glowColor}`,
                  },
                ]}
                onPress={() => toggleHabitDay(habit.id, index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    { color: theme.textTertiary },
                    completed && { color: "#ffffff" },
                  ]}
                >
                  {completed ? "✓" : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Add New Habit Button */}
      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: theme.primary,
            boxShadow: `0px 4px 20px ${theme.primaryGlow}`,
          },
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.addButtonContent}>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add New Habit</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: "row",
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 20,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  daysHeader: {
    flexDirection: "row",
    paddingBottom: 16,
    alignItems: "center",
  },
  habitNamePlaceholder: {
    flex: 1,
  },
  dayHeaderItem: {
    width: 36,
    alignItems: "center",
    marginHorizontal: 2,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  habitCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
  },
  habitInfo: {
    marginBottom: 16,
  },
  habitHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  habitNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  habitNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  habitTitleContainer: {
    flex: 1,
  },
  habitName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 24,
  },
  habitMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakText: {
    fontSize: 14,
    fontWeight: "500",
  },
  percentageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "600",
  },
  daysContainer: {
    flexDirection: "row",
    gap: 4,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    borderWidth: 2,
    elevation: 1,
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 4,
  },
  addButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonIcon: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
});
