import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy,
  Star,
  Target,
  Zap,
  Clock,
  CheckCircle,
  X,
  Play,
  Volume2,
  Heart,
  Brain,
  Award,
  TrendingUp,
  Calendar,
  Flame,
  Gift,
  Users,
  Map,
  BookOpen,
  Headphones,
  Mic,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface LanguageLearningGameProps {
  targetLanguage: string;
  currentLevel: string;
  onClose?: () => void;
}

interface GameQuestion {
  id: string;
  type: 'pronunciation' | 'translation' | 'cultural' | 'listening' | 'matching';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  audioUrl?: string;
  imageUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  category: 'greetings' | 'dining' | 'navigation' | 'emergency' | 'shopping' | 'accommodation';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  reward: string;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'streak' | 'points' | 'accuracy' | 'time';
  target: number;
  current: number;
  reward: string;
  expiresAt: Date;
}

const SAMPLE_QUESTIONS: GameQuestion[] = [
  {
    id: '1',
    type: 'pronunciation',
    question: 'How do you pronounce "Bonjour" in French?',
    options: ['BON-joor', 'bon-ZHOOR', 'BON-zhoor', 'bon-JOOR'],
    correctAnswer: 1,
    explanation: 'The correct pronunciation emphasizes the second syllable with a soft "zh" sound.',
    difficulty: 'beginner',
    points: 10,
    category: 'greetings'
  },
  {
    id: '2',
    type: 'cultural',
    question: 'In Japan, when should you bow?',
    options: ['Only to elderly people', 'When greeting anyone', 'Only in business settings', 'Never'],
    correctAnswer: 1,
    explanation: 'Bowing is a common greeting in Japan used when meeting anyone, regardless of age or setting.',
    difficulty: 'beginner',
    points: 15,
    category: 'greetings'
  },
  {
    id: '3',
    type: 'translation',
    question: 'What does "¿Dónde está el baño?" mean in English?',
    options: ['What time is it?', 'Where is the bathroom?', 'How much does it cost?', 'Can you help me?'],
    correctAnswer: 1,
    explanation: 'This is an essential phrase for travelers meaning "Where is the bathroom?"',
    difficulty: 'beginner',
    points: 10,
    category: 'navigation'
  }
];

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_phrase',
    title: 'First Words',
    description: 'Learn your first travel phrase',
    icon: <Star className="h-5 w-5" />,
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    reward: '10 bonus points'
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: <Flame className="h-5 w-5" />,
    progress: 0,
    maxProgress: 7,
    unlocked: false,
    reward: 'Offline translation unlock'
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    description: 'Score 100% on 5 quizzes',
    icon: <Target className="h-5 w-5" />,
    progress: 0,
    maxProgress: 5,
    unlocked: false,
    reward: 'Cultural etiquette guide'
  },
  {
    id: 'polyglot',
    title: 'Polyglot',
    description: 'Learn phrases in 3 different languages',
    icon: <Brain className="h-5 w-5" />,
    progress: 0,
    maxProgress: 3,
    unlocked: false,
    reward: 'Advanced pronunciation guide'
  }
];

export function LanguageLearningGame({ targetLanguage, currentLevel, onClose }: LanguageLearningGameProps) {
  const [gameMode, setGameMode] = useState<'menu' | 'quiz' | 'challenge' | 'achievements' | 'leaderboard'>('menu');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isQuizActive, setIsQuizActive] = useState(false);
  
  // Game statistics
  const [gameStats, setGameStats] = useState({
    totalPoints: 0,
    phrasesLearned: 24,
    accuracy: 85,
    streakDays: 3,
    level: 'Beginner',
    rank: 'Bronze Explorer',
    weeklyXP: 150,
    totalXP: 450
  });
  
  // Achievements state
  const [achievements, setAchievements] = useState(ACHIEVEMENTS);
  const [dailyChallenges] = useState<DailyChallenge[]>([
    {
      id: '1',
      title: 'Speed Learner',
      description: 'Complete 5 quizzes in under 2 minutes each',
      type: 'time',
      target: 5,
      current: 2,
      reward: '50 bonus XP',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      title: 'Accuracy Master',
      description: 'Maintain 90% accuracy across 10 questions',
      type: 'accuracy',
      target: 10,
      current: 6,
      reward: 'Cultural tip unlock',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  ]);
  
  const [leaderboard] = useState([
    { rank: 1, name: 'Sarah Chen', points: 2450, streak: 15, flag: '🇺🇸' },
    { rank: 2, name: 'Marco Silva', points: 2380, streak: 12, flag: '🇧🇷' },
    { rank: 3, name: 'Yuki Tanaka', points: 2250, streak: 18, flag: '🇯🇵' },
    { rank: 4, name: 'You', points: gameStats.totalXP, streak: gameStats.streakDays, flag: '🌟' },
    { rank: 5, name: 'Emma Johnson', points: 1950, streak: 8, flag: '🇬🇧' }
  ]);
  
  // Timer effect for quiz mode
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQuizActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [isQuizActive, timeLeft]);
  
  const startQuiz = () => {
    setGameMode('quiz');
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setTimeLeft(30);
    setIsQuizActive(true);
  };
  
  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    setIsQuizActive(false);
    
    const question = SAMPLE_QUESTIONS[currentQuestion];
    const isCorrect = answerIndex === question.correctAnswer;
    
    if (isCorrect) {
      setScore(prev => prev + question.points + (timeLeft * 2)); // Bonus for speed
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
    
    // Update achievements
    updateAchievements(isCorrect);
  };
  
  const nextQuestion = () => {
    if (currentQuestion < SAMPLE_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(30);
      setIsQuizActive(true);
    } else {
      finishQuiz();
    }
  };
  
  const finishQuiz = () => {
    setIsQuizActive(false);
    setGameStats(prev => ({
      ...prev,
      totalPoints: prev.totalPoints + score,
      totalXP: prev.totalXP + score
    }));
    // Show results or return to menu
    setGameMode('menu');
  };
  
  const handleTimeUp = () => {
    setShowExplanation(true);
    setIsQuizActive(false);
    setStreak(0);
  };
  
  const updateAchievements = (isCorrect: boolean) => {
    setAchievements(prev => prev.map(achievement => {
      if (achievement.id === 'first_phrase' && isCorrect && achievement.progress === 0) {
        return { ...achievement, progress: 1, unlocked: true };
      }
      if (achievement.id === 'perfect_score' && isCorrect && selectedAnswer === SAMPLE_QUESTIONS[currentQuestion].correctAnswer) {
        return { ...achievement, progress: Math.min(achievement.progress + 1, achievement.maxProgress) };
      }
      return achievement;
    }));
  };
  
  const speakText = (text: string) => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = `${targetLanguage}-${targetLanguage.toUpperCase()}`;
      window.speechSynthesis.speak(utterance);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Language Learning Game</h2>
          <Badge variant="outline">{gameStats.level}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Game Stats Bar */}
      <div className="px-4 py-2 bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{gameStats.totalXP} XP</span>
            </div>
            <div className="flex items-center space-x-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>{gameStats.streakDays} day streak</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4 text-green-500" />
              <span>{gameStats.accuracy}% accuracy</span>
            </div>
          </div>
          <Badge variant="secondary">{gameStats.rank}</Badge>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {/* Menu Mode */}
        {gameMode === 'menu' && (
          <div className="p-4 space-y-4">
            {/* Daily Challenges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Daily Challenges</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dailyChallenges.map((challenge) => (
                  <div key={challenge.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{challenge.title}</h4>
                      <p className="text-xs text-muted-foreground">{challenge.description}</p>
                      <Progress 
                        value={(challenge.current / challenge.target) * 100} 
                        className="h-2 mt-2"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {challenge.current}/{challenge.target}
                        </span>
                        <span className="text-xs text-green-600">{challenge.reward}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Game Modes */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={startQuiz}>
                <CardContent className="p-4 text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-medium">Quick Quiz</h3>
                  <p className="text-sm text-muted-foreground">Test your knowledge</p>
                  <Badge className="mt-2">+10-50 XP</Badge>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 text-center">
                  <Headphones className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-medium">Pronunciation</h3>
                  <p className="text-sm text-muted-foreground">Practice speaking</p>
                  <Badge className="mt-2">+15-40 XP</Badge>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 text-center">
                  <Map className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-medium">Travel Scenario</h3>
                  <p className="text-sm text-muted-foreground">Real-world situations</p>
                  <Badge className="mt-2">+20-60 XP</Badge>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Cultural Quiz</h3>
                  <p className="text-sm text-muted-foreground">Learn etiquette</p>
                  <Badge className="mt-2">+25-50 XP</Badge>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setGameMode('achievements')}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Achievements
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setGameMode('leaderboard')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
              <Button variant="outline" size="sm">
                <Gift className="h-4 w-4 mr-2" />
                Rewards
              </Button>
            </div>
          </div>
        )}
        
        {/* Quiz Mode */}
        {gameMode === 'quiz' && (
          <div className="p-4 space-y-4">
            {/* Quiz Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  Question {currentQuestion + 1}/{SAMPLE_QUESTIONS.length}
                </Badge>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{timeLeft}s</span>
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{score} XP</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <Progress value={(currentQuestion / SAMPLE_QUESTIONS.length) * 100} className="h-2" />
            
            {/* Question Card */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <Badge variant="secondary" className="mb-3">
                      {SAMPLE_QUESTIONS[currentQuestion]?.category}
                    </Badge>
                    <h3 className="text-lg font-medium mb-4">
                      {SAMPLE_QUESTIONS[currentQuestion]?.question}
                    </h3>
                  </div>
                  
                  <div className="grid gap-2">
                    {SAMPLE_QUESTIONS[currentQuestion]?.options.map((option, index) => (
                      <Button
                        key={index}
                        variant={
                          showExplanation
                            ? index === SAMPLE_QUESTIONS[currentQuestion].correctAnswer
                              ? "default"
                              : index === selectedAnswer && index !== SAMPLE_QUESTIONS[currentQuestion].correctAnswer
                                ? "destructive"
                                : "outline"
                            : selectedAnswer === index
                              ? "secondary"
                              : "outline"
                        }
                        className="justify-start h-auto p-3 text-left"
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showExplanation}
                      >
                        <span className="mr-2 font-medium">{String.fromCharCode(65 + index)}.</span>
                        {option}
                        {showExplanation && index === SAMPLE_QUESTIONS[currentQuestion].correctAnswer && (
                          <CheckCircle className="h-4 w-4 ml-auto text-green-500" />
                        )}
                      </Button>
                    ))}
                  </div>
                  
                  {showExplanation && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Explanation:</h4>
                      <p className="text-sm text-muted-foreground">
                        {SAMPLE_QUESTIONS[currentQuestion]?.explanation}
                      </p>
                      
                      {selectedAnswer === SAMPLE_QUESTIONS[currentQuestion].correctAnswer ? (
                        <div className="flex items-center mt-3 text-green-600">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">
                            Correct! +{SAMPLE_QUESTIONS[currentQuestion]?.points + (timeLeft * 2)} XP
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center mt-3 text-red-600">
                          <X className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Incorrect. Try again!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Quiz Actions */}
            {showExplanation && (
              <div className="flex justify-center">
                <Button onClick={nextQuestion}>
                  {currentQuestion < SAMPLE_QUESTIONS.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Achievements Mode */}
        {gameMode === 'achievements' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Achievements</h3>
              <Button variant="ghost" onClick={() => setGameMode('menu')}>
                Back to Menu
              </Button>
            </div>
            
            <div className="grid gap-4">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className={achievement.unlocked ? 'bg-green-50 border-green-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-full ${achievement.unlocked ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Progress 
                            value={(achievement.progress / achievement.maxProgress) * 100} 
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-muted-foreground">
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                        </div>
                        {achievement.unlocked && (
                          <Badge className="mt-2" variant="secondary">
                            <Award className="h-3 w-3 mr-1" />
                            {achievement.reward}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Leaderboard Mode */}
        {gameMode === 'leaderboard' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Weekly Leaderboard</h3>
              <Button variant="ghost" onClick={() => setGameMode('menu')}>
                Back to Menu
              </Button>
            </div>
            
            <div className="space-y-2">
              {leaderboard.map((user, index) => (
                <Card key={user.rank} className={user.name === 'You' ? 'bg-primary/5 border-primary/20' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                          {user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : user.rank}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-lg">{user.flag}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{user.points} XP</span>
                            <div className="flex items-center space-x-1">
                              <Flame className="h-3 w-3" />
                              <span>{user.streak} days</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h4 className="font-medium text-blue-900">Keep Learning!</h4>
                <p className="text-sm text-blue-700">
                  Complete daily challenges to climb the leaderboard
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}