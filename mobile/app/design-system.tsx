import React from 'react';
import {Redirect} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ComponentCatalogue} from '../src/design/ComponentCatalogue';
import {useSession} from '../src/session';
import {useTheme} from '../src/design/theme';
export default function DesignSystem(){const {data}=useSession();const {colors:C}=useTheme();if(data?.user.role!=='admin')return <Redirect href="/"/>;return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}><ComponentCatalogue/></SafeAreaView>;}
