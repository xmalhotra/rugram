import {Redirect} from 'expo-router';
// Keep old links working without taking focus selection outside the tab bar.
export default function OnboardingScreen(){return <Redirect href="/(tabs)"/>;}
