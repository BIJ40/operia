// Arbre de questions Plomberie - importé depuis JSON
import { QuestionTree } from '../types';
import arbrePlomberieData from '../data/arbre_plomberie.json';

// Cast du JSON vers le type QuestionTree
export const rtTreePlomberie: QuestionTree = arbrePlomberieData as QuestionTree;

export default rtTreePlomberie;
