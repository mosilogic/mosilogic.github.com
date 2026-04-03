import { Component, OnInit, Renderer2 } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'Mosilogic';
  isDark = false;

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    // Sync isDark with the class applied by the script in index.html
    this.isDark = document.documentElement.classList.contains('dark');
  }

  toggleDark(): void {
    this.isDark = !this.isDark;
    const theme = this.isDark ? 'dark' : 'light';
    
    if (this.isDark) {
      this.renderer.addClass(document.documentElement, 'dark');
    } else {
      this.renderer.removeClass(document.documentElement, 'dark');
    }
    
    localStorage.setItem('theme', theme);
  }
}
