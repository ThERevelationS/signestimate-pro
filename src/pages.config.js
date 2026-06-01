/**
 * pages.config.js — Page routing configuration.
 *
 * Every page is loaded LAZILY via React.lazy so the initial JS bundle for the
 * Dashboard does not include the code for every other page in the app.
 * App.jsx wraps the route tree in a <Suspense> boundary with a skeleton
 * fallback so the Layout chrome stays visible during chunk download.
 *
 * The Layout component itself is eagerly imported — it's needed on every page.
 *
 * To change the landing page, update the `mainPage` value below to a key that
 * exists in the PAGES object.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const CNCProjects = lazy(() => import('./pages/CNCProjects'));
const CNCSettings = lazy(() => import('./pages/CNCSettings'));
const ChannelLetterInstallationProjects = lazy(() => import('./pages/ChannelLetterInstallationProjects'));
const ChannelLetterInstallationSettings = lazy(() => import('./pages/ChannelLetterInstallationSettings'));
const ChannelLetterInstallInventory = lazy(() => import('./pages/ChannelLetterInstallInventory'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FormulaViewer = lazy(() => import('./pages/FormulaViewer'));
const FoundationInventory = lazy(() => import('./pages/FoundationInventory'));
const FoundationProjects = lazy(() => import('./pages/FoundationProjects'));
const FoundationSettings = lazy(() => import('./pages/FoundationSettings'));
const Home = lazy(() => import('./pages/Home'));
const Inventory = lazy(() => import('./pages/Inventory'));
const MasterInventory = lazy(() => import('./pages/MasterInventory'));
const LaserProjects = lazy(() => import('./pages/LaserProjects'));
const LaserSettings = lazy(() => import('./pages/LaserSettings'));
const MetalProjects = lazy(() => import('./pages/MetalProjects'));
const MetalSettings = lazy(() => import('./pages/MetalSettings'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const NewCNCEstimate = lazy(() => import('./pages/NewCNCEstimate'));
const NewChannelLetterInstallation = lazy(() => import('./pages/NewChannelLetterInstallation'));
const NewFoundationEstimate = lazy(() => import('./pages/NewFoundationEstimate'));
const NewLaserEstimate = lazy(() => import('./pages/NewLaserEstimate'));
const NewMetalEstimate = lazy(() => import('./pages/NewMetalEstimate'));
const NewPaintEstimate = lazy(() => import('./pages/NewPaintEstimate'));
const NewSignMaintenance = lazy(() => import('./pages/NewSignMaintenance'));
const SignMaintenanceProjects = lazy(() => import('./pages/SignMaintenanceProjects'));
const SignMaintenanceSettings = lazy(() => import('./pages/SignMaintenanceSettings'));
const MaintenanceInventory = lazy(() => import('./pages/MaintenanceInventory'));
const PaintProjects = lazy(() => import('./pages/PaintProjects'));
const PaintSettings = lazy(() => import('./pages/PaintSettings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const TierMarkups = lazy(() => import('./pages/TierMarkups'));
const Admin = lazy(() => import('./pages/Admin'));
const CustomerSummary = lazy(() => import('./pages/CustomerSummary'));
const CustomerSummaries = lazy(() => import('./pages/CustomerSummaries'));
const Report = lazy(() => import('./pages/Report'));
const NewVinylEstimate = lazy(() => import('./pages/NewVinylEstimate'));
const VinylProjects = lazy(() => import('./pages/VinylProjects'));
const VinylSettings = lazy(() => import('./pages/VinylSettings'));
const VinylInventory = lazy(() => import('./pages/VinylInventory'));

export const PAGES = {
    "CNCProjects": CNCProjects,
    "CNCSettings": CNCSettings,
    "ChannelLetterInstallationProjects": ChannelLetterInstallationProjects,
    "ChannelLetterInstallationSettings": ChannelLetterInstallationSettings,
    "ChannelLetterInstallInventory": ChannelLetterInstallInventory,
    "Dashboard": Dashboard,
    "FormulaViewer": FormulaViewer,
    "FoundationInventory": FoundationInventory,
    "FoundationProjects": FoundationProjects,
    "FoundationSettings": FoundationSettings,
    "Home": Home,
    "Inventory": Inventory,
    "MasterInventory": MasterInventory,
    "LaserProjects": LaserProjects,
    "LaserSettings": LaserSettings,
    "MetalProjects": MetalProjects,
    "MetalSettings": MetalSettings,
    "MyProfile": MyProfile,
    "NewCNCEstimate": NewCNCEstimate,
    "NewChannelLetterInstallation": NewChannelLetterInstallation,
    "NewFoundationEstimate": NewFoundationEstimate,
    "NewLaserEstimate": NewLaserEstimate,
    "NewMetalEstimate": NewMetalEstimate,
    "NewPaintEstimate": NewPaintEstimate,
    "NewSignMaintenance": NewSignMaintenance,
    "SignMaintenanceProjects": SignMaintenanceProjects,
    "SignMaintenanceSettings": SignMaintenanceSettings,
    "MaintenanceInventory": MaintenanceInventory,
    "PaintProjects": PaintProjects,
    "PaintSettings": PaintSettings,
    "UserManagement": UserManagement,
    "TierMarkups": TierMarkups,
    "Admin": Admin,
    "CustomerSummary": CustomerSummary,
    "CustomerSummaries": CustomerSummaries,
    "Report": Report,
    "NewVinylEstimate": NewVinylEstimate,
    "VinylProjects": VinylProjects,
    "VinylSettings": VinylSettings,
    "VinylInventory": VinylInventory,
};

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};