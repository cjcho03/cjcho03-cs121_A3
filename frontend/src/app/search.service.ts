import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  searchString = "";

  constructor(private router: Router) { }

  doSearch(searchString: string) {
    this.searchString = searchString;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(["/search"], {
        onSameUrlNavigation: 'reload'
      });
    });
  }
}
